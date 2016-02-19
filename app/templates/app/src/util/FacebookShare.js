var MetaHandler = require('util/MetaHandler');

/**
 * facebook
 * https://developers.facebook.com/docs/sharing/best-practices
 *
 * @param data = {
     *  url,
     *  type,
     *  title,
     *  description,
     *  image
     * }
 *
 */
function share(data) {
  data = data || {};
  MetaHandler.createMeta('og:url').setContent('og:url', data.url || window.location.href);
  MetaHandler.createMeta('og:type').setContent('og:type', data.type || 'article');
  MetaHandler.createMeta('og:title').setContent('og:title', data.title || document.title);
  MetaHandler.createMeta('og:description').setContent('og:description', data.description);
  MetaHandler.createMeta('og:image').setContent('og:image', data.image);
}

module.exports = share;
