  Ext.define('CustomApp', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',
    scopeType: 'iteration',
    comboboxConfig: {
        fieldLabel: 'Select a Iteration:',
        labelWidth: 100,
        width: 300
    },
    
  
    onScopeChange: function() {
      //var that = this;
      if (!this.down('#userCombobox')) {
	this.add({
	    xtype: 'rallyusersearchcombobox',
	    itemId: 'userCombobox',
	    fieldLabel: 'SELECT USER:',
	    project: this.getContext().getProject()._ref,
		listeners:{
		    ready: function(combobox){
			this._onUserSelected(combobox.getRecord());
		   },
		   select: function(combobox){
			this._onUserSelected(combobox.getRecord());
		   },
		    scope: this
		}
	})
      }
      this._makeStore();
    },
    
    _onUserSelected:function(record){
	console.log('user', record);
    },
    _makeStore:function(){
	Ext.create('Rally.data.WsapiDataStore', {
	model: 'User Story',
	fetch: ['FormattedID','Name', 'ScheduleState','Tasks'],  
	limit: Infinity,
	autoLoad: true,
	filters: [this.getContext().getTimeboxScope().getQueryFilter()],
	listeners: {
	    load: this._onStoriesLoaded,
	    scope: this
	}
	});
    },
    
    _onStoriesLoaded:function(store, records){
	var storiesWithTasks = [];
        var that = this;
        var promises = [];
	if(records.length===0){
	    if(that.down('#storyGrid')){
		that.down('#storyGrid').destroy();
	    }
	}
	else{
	    _.each(records, function(story){
            promises.push(that._getTasks(story, that));
	    });
	    Deft.Promise.all(promises).then({
	      success: function(stories){
		_.each(stories, function(story){
		  if (story.Tasks.length > 0) {
		    storiesWithTasks.push(story);
		  }
		})
		that._makeGrid(storiesWithTasks);
	      }
	    })
	}
	
     }, 
    _getTasks:function(story, scope){
      var tasks = [];
      var s = {};
      
      var deferred = Ext.create('Deft.Deferred');
      var that = scope;
      
      var taskCollection = story.getCollection('Tasks',{fetch: ['Name', 'FormattedID', 'State', 'Owner']});
      taskCollection.load({
	callback: function(records, operation, success){
	  _.each(records, function(task){
	    tasks.push(task);
	  });
	  s = {
	    "_ref": story.get('_ref'),
            "FormattedID": story.get('FormattedID'),
            "Name": story.get('Name'),
	    "ScheduleState":story.get('ScheduleState'),
            "Tasks": tasks
	  };
	  deferred.resolve(s);
	}
      });
      console.log('deferred', deferred);
      return deferred;
    },
    
    _makeGrid:function(storiesWithTasks){
      console.log('storiesWithTasks count',storiesWithTasks.length);
      var that = this;
      if(that.down('#storyGrid')){
	that.down('#storyGrid').destroy();
      }
      var gridStore = Ext.create('Rally.data.custom.Store', {
	  data: storiesWithTasks,
	  limit:Infinity,
	  remoteSort: false
      });
      that.add({
	xtype: 'rallygrid',
	itemId: 'storyGrid',
	store: gridStore,
	columnCfgs:[
	    {
	      text: 'Formatted ID', dataIndex: 'FormattedID', xtype: 'templatecolumn',
		tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate') 
	    },
	    {
	      text: 'Name', dataIndex: 'Name',
	    },
	    {
	      text: 'ScheduleState', dataIndex: 'ScheduleState',
	    },
	    {
		text: 'Tasks', dataIndex: 'Tasks', flex:1,
		renderer: function(value) {
		    var owner;
		    var html = [];
		    _.each(value, function(task){
			owner = (task.get('Owner') && task.get('Owner')._refObjectName) || 'None';
			html.push('<a href="' + Rally.nav.Manager.getDetailUrl(task) + '">' + task.get('FormattedID') + '</a>' + ' <b>Name:</b>' + task.get('Name') + ' <b>State:</b>' + task.get('State') + ' <b>Owner:</b>' + owner) ;
		    });
		    return html.join('<br/>');
		}
	    }  
	]
      });
    }
 });