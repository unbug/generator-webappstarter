define(function (require, exports, module) {
  function Pubsub(Subject) {
    var topics = {};

    function subscribe(topic, observer) {
      var subject;
      for (var key in topics) {
        if (key === topic) {
          subject = topics[key];
          break;
        }
      }
      if (!subject) {
        subject = new Subject();
        addTopic(topic, subject);
      }
      subject.register(observer);
      return this;
    }

    function unsubscribe(topic) {
      removeTopic(topic);
      return this;
    }

    function publish(topic) {
      var args = [].slice.call(arguments);
      topics[topic] && topics[topic].notify.apply(topics[topic], args.slice(1));
      return this;
    }

    function addTopic(topic, subject) {
      topics[topic] = subject;
    }

    function removeTopic(topic) {
      delete topics[topic];
    }

    function getTopics() {
      var _topics = [];
      for (var key in topics) {
        (typeof key === 'string') && _topics.push(key);
      }
      return _topics;
    }

    this.getTopics = getTopics;
    this.subscribe = subscribe;
    this.unsubscribe = unsubscribe;
    this.publish = publish;
  }

  return Pubsub;
});
