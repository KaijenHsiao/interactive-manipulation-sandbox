define([
  'ember',
  'emberdata',
  'app',
  'ros',
  'action',
],
function( Ember, DS, App, ros, Action) {

  App.Robot = DS.Model.extend({
    name: DS.attr('string'),
    description: DS.attr('string'),
    tags: DS.attr('string'),
    image: DS.attr('string'),
    state: DS.attr('number'),
    service_url: DS.attr('string'),
    camera_url: DS.attr('string'),
    battery: -1,

    serviceUrlChanged: function() {
      var that = this;
      var serviceUrl = that.get('service_url');
      ros.connect(serviceUrl);
      var topic = new ros.Topic({
        name: '/dashboard_agg',
        messageType: 'pr2_msgs/DashboardState'
      });
      topic.subscribe(function(message) {
        that.set('battery', message.power_state.relative_capacity);
      });
    }.observes('service_url'),

    navigateTo: function(place) {
      var action = new Action({
        ros: ros,
        name: 'NavigateToPose'
      });
      action.inputs.x        = place.get('pose_x');
      action.inputs.y        = place.get('pose_y');
      action.inputs.theta    = place.get('pose_angle');
      action.inputs.frame_id = '/map';
      action.execute();
      console.log('Calling NavigateTo action');
    },

    unplug: function() {
      var action = new Action({
        ros: this.ROS,
        name: 'Unplug'
      });
      action.execute();
      console.log("Calling Unplug action");
    },

    plugIn: function() {
      var action = new Action({
        ros: this.ROS,
        name: 'PlugIn'
      });
      action.execute();
      console.log("Calling PlugIn action");
    }
  });

});
