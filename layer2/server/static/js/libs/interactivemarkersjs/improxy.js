(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['eventemitter2'], factory);
  }
  else {
    root.ImProxy = factory(root.EventEmitter2);
  }
}(this, function (EventEmitter2) {

  var ImProxy = {};

  var Client = ImProxy.Client = function(ros) {
    this.ros = ros;
    this.interactiveMarkers = {};
  };
  Client.prototype.__proto__ = EventEmitter2.prototype;

  Client.prototype.subscribe = function(topicName) {
    this.unsubscribe();

    this.markerUpdateTopic = new this.ros.Topic({
      name : topicName + '/tunneled/update',
      messageType : 'visualization_msgs/InteractiveMarkerUpdate'
    });
    this.markerUpdateTopic.subscribe(this.markerUpdate.bind(this));

    this.feedbackTopic = new this.ros.Topic({
      name : topicName + '/feedback',
      messageType : 'visualization_msgs/InteractiveMarkerFeedback'
    });
    this.feedbackTopic.advertise();
    
    this.initService = new this.ros.Service({
        name        : topicName + '/tunneled/get_init'
      , serviceType : 'demo_interactive_markers/GetInit'
    });
    var request = new this.ros.ServiceRequest({});
    this.initService.callService(request, this.markerInit.bind(this));
  };
  
  Client.prototype.deleteMarker = function(markerName) {
    this.emit('deleted_marker', markerName);
    delete this.interactiveMarkers[markerName];
  }
  
  Client.prototype.unsubscribe = function() {
    if ( this.markerUpdateTopic ) {
      this.markerUpdateTopic.unsubscribe();
      this.feedbackTopic.unadvertise();
    }
    for( markerName in this.interactiveMarkers ) {
      this.deleteMarker(markerName);
    }
    this.interactiveMarkers = {};
  }
  
  Client.prototype.markerInit = function(initMessage) {
    var message = initMessage.msg;
    message.erases = [];
    message.poses = [];
    this.markerUpdate(message);
  }

  Client.prototype.markerUpdate = function(message) {
    var that = this;

    // Deletes markers
    message.erases.forEach(function(name) {
      var marker = that.interactiveMarkers[name];
      that.deleteMarker(name);
    });

    // Updates marker poses
    message.poses.forEach(function(poseMessage) {
      var marker = that.interactiveMarkers[poseMessage.name];
      if (marker) {
        marker.setPoseFromServer(poseMessage.pose);
      }
    });

    // Adds new markers
    message.markers.forEach(function(imMsg) {
      var oldMarker = that.interactiveMarkers[imMsg.name];
      if (oldMarker) {
        that.deleteMarker(oldMarker.name);
      }

      var marker = new ImProxy.IntMarkerHandle(imMsg, that.feedbackTopic);
      that.interactiveMarkers[imMsg.name] = marker;
      that.emit('created_marker', marker);
    });
  };
  
  /* Handle with signals for a single interactive marker */

  var IntMarkerHandle = ImProxy.IntMarkerHandle = function(imMsg, feedbackTopic) {
    this.feedbackTopic = feedbackTopic;
    this.pose     = imMsg.pose;
    this.name     = imMsg.name;
    this.header   = imMsg.header;
    this.controls = imMsg.controls;
    this.menuEntries = imMsg.menu_entries;
  };
  
  IntMarkerHandle.prototype.__proto__ = EventEmitter2.prototype;

  var KEEP_ALIVE = 0;
  var POSE_UPDATE = 1;
  var MENU_SELECT = 2;
  var BUTTON_CLICK = 3;
  var MOUSE_DOWN = 4;
  var MOUSE_UP = 5;
  
  IntMarkerHandle.prototype.setPoseFromServer = function(poseMsg) {
    this.pose.position = poseMsg.position;
    this.pose.orientation = poseMsg.orientation;
    this.emit('server_updated_pose', poseMsg);
  };

  IntMarkerHandle.prototype.setPoseFromClient = function(pose) {
    this.pose.position.x = pose.position.x;
    this.pose.position.y = pose.position.y;
    this.pose.position.z = pose.position.z;
    this.pose.orientation.x = pose.orientation.x;
    this.pose.orientation.y = pose.orientation.y;
    this.pose.orientation.z = pose.orientation.z;
    this.pose.orientation.w = pose.orientation.w;
    this.emit('client_updated_pose', pose);
    this.sendFeedback(POSE_UPDATE);
  };

  IntMarkerHandle.prototype.onButtonClick = function(event) {
    this.sendFeedback(BUTTON_CLICK, event.clickPosition);
  };

  IntMarkerHandle.prototype.onMouseDown = function(event) {
    this.sendFeedback(MOUSE_DOWN, event.clickPosition);
  }

  IntMarkerHandle.prototype.onMouseUp = function(event) {
    this.sendFeedback(MOUSE_UP, event.clickPosition);
  }

  IntMarkerHandle.prototype.onMenuSelect = function(event) {
    this.sendFeedback(MENU_SELECT, undefined, event.id);
  }

  IntMarkerHandle.prototype.sendFeedback = function(eventType, clickPosition, menu_entry_id) {
    
    var mouse_point_valid = clickPosition !== undefined;
    var clickPosition = clickPosition || {
      x : 0,
      y : 0,
      z : 0
    };

    var feedback = {
      header       : this.header,
      client_id    : '',
      marker_name  : this.name,
      control_name : '',
      event_type   : eventType,
      pose         : this.pose,
      mouse_point  : clickPosition,
      mouse_point_valid: mouse_point_valid,
      menu_entry_id: menu_entry_id
    }

    this.feedbackTopic.publish(feedback);
  };

  return ImProxy;
}));
