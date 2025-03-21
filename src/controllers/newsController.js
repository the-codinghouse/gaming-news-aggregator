const cache = require('memory-cache');
const RSSParser = require('rss-parser');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/errors');

// Configure RSSParser to pick up media fields
const parser = new RSSParser({
  customFields: {
    item: ['media:content', 'media:thumbnail']
  }
});
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION_MS) || 300000; // 5 minutes

class NewsController {
  // Arrow function so that `this` is bound correctly
  getLatestNews = async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const cachedNews = cache.get('latest_news');
      if (cachedNews) {
        return this.paginateResults(res, cachedNews, page, limit);
      }
      const feed = await parser.parseURL(process.env.IGN_NEWS_FEED_URL);
      const news = feed.items.map(item => ({
        title: item.title,
        description: item.contentSnippet,
        link: item.link,
        pubDate: item.pubDate,
        image:
            item.enclosure?.url ||
            (
                item['media:content'] ? (
                Array.isArray(item['media:content']) ?
                    item['media:content'][0]?.$?.url :
                    item['media:content'].$?.url
                ) : null
            ) ||
            (
                item['media:thumbnail'] ? (
                Array.isArray(item['media:thumbnail']) ?
                    item['media:thumbnail'][0]?.$?.url :
                    item['media:thumbnail'].$?.url
                ) : null
            ) ||
            'https://via.placeholder.com/150'
      }));
      console.log(news);
      cache.put('latest_news', news, CACHE_DURATION);
      this.paginateResults(res, news, page, limit);
    } catch (error) {
      logger.error('Error fetching latest news:', error);
      next(new ApiError('Failed to fetch latest news', 500));
    }
  };

  // Standard method – doesn't need binding if called within the same instance
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

  // Convert searchNews to an arrow function as well
  searchNews = async (req, res, next) => {
    try {
      const { q } = req.query;
      const cachedNews = cache.get('latest_news');
      const news = cachedNews || await this.fetchNews();
      const searchResults = news.filter(item =>
        item.title.toLowerCase().includes(q.toLowerCase()) ||
        item.description.toLowerCase().includes(q.toLowerCase())
      );
      res.json({
        success: true,
        data: searchResults
      });
    } catch (error) {
      logger.error('Error searching news:', error);
      next(new ApiError('Failed to search news', 500));
    }
  };

  async fetchNews() {
    const feed = await parser.parseURL(process.env.IGN_NEWS_FEED_URL);
    const news = feed.items.map(item => ({
      title: item.title,
      description: item.contentSnippet,
      link: item.link,
      pubDate: item.pubDate,
      image:
        item.enclosure?.url ||
        (item['media:content'] && Array.isArray(item['media:content']) && item['media:content'][0]?.$?.url) ||
        (item['media:thumbnail'] && Array.isArray(item['media:thumbnail']) && item['media:thumbnail'][0]?.$?.url)
    }));
    cache.put('latest_news', news, CACHE_DURATION);
    return news;
  }
}

module.exports = new NewsController();
