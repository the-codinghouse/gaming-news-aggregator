const cache = require('memory-cache');
const RSSParser = require('rss-parser');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/errors');

const parser = new RSSParser();
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION_MS) || 300000; // 5 minutes

class GamesController {
  async getTopGames(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const cachedGames = cache.get('top_games');
      if (cachedGames) {
        return this.paginateResults(res, cachedGames, page, limit);
      }

      const feed = await parser.parseURL(process.env.IGN_REVIEWS_FEED_URL);
      const games = feed.items
        .map(item => ({
          title: item.title,
          description: item.contentSnippet,
          link: item.link,
          pubDate: item.pubDate,
          score: this.extractScore(item.contentSnippet),
          image: item.enclosure?.url
        }))
        .filter(game => game.score)
        .sort((a, b) => b.score - a.score);

      cache.put('top_games', games, CACHE_DURATION);
      this.paginateResults(res, games, page, limit);
    } catch (error) {
      logger.error('Error fetching top games:', error);
      next(new ApiError('Failed to fetch top games', 500));
    }
  }

  async getGameById(req, res, next) {
    try {
      const { id } = req.params;
      const cachedGames = cache.get('top_games');
      const games = cachedGames || await this.fetchGames();

      const game = games.find(g => g.link.includes(id));
      if (!game) {
        return next(new ApiError('Game not found', 404));
      }

      res.json({
        success: true,
        data: game
      });
    } catch (error) {
      logger.error('Error fetching game details:', error);
      next(new ApiError('Failed to fetch game details', 500));
    }
  }

  async fetchGames() {
    const feed = await parser.parseURL(process.env.IGN_REVIEWS_FEED_URL);
    const games = feed.items
      .map(item => ({
        title: item.title,
        description: item.contentSnippet,
        link: item.link,
        pubDate: item.pubDate,
        score: this.extractScore(item.contentSnippet),
        image: item.enclosure?.url
      }))
      .filter(game => game.score)
      .sort((a, b) => b.score - a.score);

    cache.put('top_games', games, CACHE_DURATION);
    return games;
  }

  extractScore(content) {
    const scoreMatch = content.match(/(\d+(\.\d+)?)\s*\/\s*10/);
    return scoreMatch ? parseFloat(scoreMatch[1]) : null;
  }

  paginateResults(res, data, page, limit) {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const results = data.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: results,
      pagination: {
        current: page,
        total: Math.ceil(data.length / limit),
        hasMore: endIndex < data.length
      }
    });
  }
}

module.exports = new GamesController();