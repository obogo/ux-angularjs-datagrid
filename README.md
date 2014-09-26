####[Releases](https://github.com/webux/ux-angularjs-datagrid/releases)
- Release 1.1.0 [Source Code (zip)](https://github.com/webux/ux-angularjs-datagrid/archive/v1.1.0.zip) | [Source Code (tar.gz)](https://github.com/webux/ux-angularjs-datagrid/archive/v1.1.0.tar.gz)

## ux-datagrid : An Angular DataGrid ##
----------

[![Build Status](https://travis-ci.org/webux/ux-angularjs-datagrid.svg?branch=master)](https://travis-ci.org/webux/ux-angularjs-datagrid)

[Examples (in progress)](http://webux.github.io/ux-angularjs-datagrid/)

**Highly performant list and datagrid for AngularJS** designed for mobile devices which just makes it all the better on a desktop.

Most lists work with recycled or just-in-time created rows for long lists in angular. **Datagrid doesn't work that way because in order to get a smooth scrolling experience on a mobile device you need to allow the browser to handle the scrolling as much as possible**. So to accomplish this Datagrid works on a chunking algorithm to create pieces as they come into view, but never destroy them until the whole grid is destroyed. This allows the scrolling experience to be smooth because the GPU is leveraged from the browser as the DOM is considered to be static until in view.

Of course since this is angular there is then the issue with a **digest being too expensive. This is not a problem** because all rows are disabled from the digest when out of view and enabled when in view. So they don't lose their scopes or have to create new ones constantly, but only once. Then **they are just enabled or disabled as they come into view**.

- [Demos](https://rawgithub.com/webux/ux-angularjs-datagrid/master/samples/index.html)
- [Unit Tests](https://rawgithub.com/webux/ux-angularjs-datagrid/master/test/index.html)
- [Docs - in Progress](https://rawgithub.com/webux/ux-angularjs-datagrid/master/docs/angular-ux-datagrid.js.html)

### More Examples ###
- [Simple Fiddle Example](http://jsfiddle.net/wesjones/uftsG/)
- [Infinite Scroll Example](http://jsfiddle.net/wesjones/sqas5wjp/)
- [Quick Start](https://github.com/webux/ux-angularjs-datagrid/wiki/#wiki-quick-start)
- [Getting Started](https://github.com/webux/ux-angularjs-datagrid/wiki/#wiki-getting-started)
- [Multiple Row Templates](https://github.com/webux/ux-angularjs-datagrid/wiki/#wiki-multiple-row-templates)
- [Grouped Data](https://github.com/webux/ux-angularjs-datagrid/wiki/#wiki-grouped-data)

## What makes this list/datagrid different? ##
Chunking is the concept of **grouping the DOM elements in hierarchies** so that the browser does not calculate the position of every element when one changes, but only those in that container, its parents in its container, and so on up the chain. The smaller the groups, the less the browser has to redraw, size, and position elements because it can just move the parent if necessary. **This works regardless of rows all having the same heights or dynamic heights as long as there is a template for each different height.**

Using this concept, datagrid is able to **create many more rows** that are listed natively **like static HTML and allows the browser to use GPU snapshots to keep scrolling smooth**. Dynamic changes cause repaints that are expensive, so this avoids that.

**Chunking doesn't have to create them all** though. To make sure the datagrid could start up and jump to any section quickly it needed to be able to only put in chunks that are in view. So once a chunk is requested it will be created if it was not already. This makes it so that a list of 50,000 items can still start up quickly and jump to any location and scroll as smooth as glass on your mobile device.

## Time to get your hands dirty! ##
Datagrid uses the concept of templates for your rows. You can have as many templates as you like. You can even overwrite the `templateModel` for one of your own as long as you implement the same API. You just need to assign it as an addon. (We will discuss those later).

First we will create the directive and assign it an array so it has something to display.

```html
	<div ux-datagrid="items"></div>
```

These items are read from the scope that the datagrid exists in. It will then take that data and convert it into a normalized array so it can display every item. This does nothing for single dimensional arrays, but for arrays that are multi-dimensional it creates a single array of those based on the `grouped` property.

Grouped property is for reading a hierarchy. If you have an object with the property `children` that is an array, then "children" would be your grouped property for the datagrid to read it. See this example for use of grouped data. [Grouped Data Example](https://rawgithub.com/webux/ux-datagrid/master/samples/lotsOfRows/index.html)

In most cases your datagrid will look similar to this one below.

```html
	<div ux-datagrid="items">
		<script type="template/html" data-template-name="default" data-template-item="item">
			<div class="row">{{item}}</div>
		</script>
	</div>
```

What is really happening here is that the directive is setup with a script template inside of it. The script template allows the contents to be read as a string rather than be interpreted as DOM by the browser. So it makes a very convenient way of writing out your row templates.

The script template has 3 properties. 

- **type="template/html"** it uses this to match on. So if you don't get it right might not work. This is required.
- **template-name** if this is not defined it will be changed to 'default'. So this one is not required if you only have one template, but if you have more than one the second will overwrite the first without this property.
- **template-item** this is what you want the data to be referenced by on the row scope. Such as in angular if you do a repeat with "item in items" you then reference `item` in your template. This does the same thing with this property.

###Dynamically specify your templates instead of using script templates###
- [Demo](https://rawgithub.com/webux/ux-angularjs-datagrid/master/samples/app/index.html#/other/templateData)
- [Fiddle](http://jsfiddle.net/m2tRh/1/)

As of 0.6.4 you can also pass a template data object to be used an an option to script templates. To do this you just need to reference an object and pass to the grid options like so.

```html
    <div data-ux-datagrid="items" class="datagrid" data-options="{templateModel:{templates:templates}}"></div>
```

Then just define `templates` on your scope. Like so:

```js
    $scope.templates = [
        {
            template: '<div class="row"><div>{{item.id}}</div></div>',
            name: 'default',
            item: 'item',
            base: null
        }
    ];
```

**Please note that script templates will override these templates if they have the same name.** Such as if you have a template with the name 'default' and a script template with the data-template-name="default" then the script template will overwrite the other template.

## Addons / Plugins ##
Addons are like a plugin to the datagrid. It actually becomes a behavior modifier of the datagrid object. Addons are created as factories and applied directly to the datagrid instance. The internals of the datagrid are constructed with addons as well.

Because these addons assign themselves as behaviors to the instance behaviors can be overwritten. So if you need to modify core behavior then go right ahead and add an addon that overwrites those methods.

**How to create an addon**
Addons are factories that modify the behavior. To create an addon you just need to create the factory and then add it to the DOM.

```js
	angular.module('ux').factory('datagridVersion', function () {
		return function (datagrid) {
			datagrid.version = "0.1.0";
		};
	});
```

Now we need to add it to the DOM.

```html
	<div ux-datagrid="items" data-addons="datagridVersion">...</div>
```

Now when this datagrid is created it will call the `datagridVersion` factory and pass to it the datagrid instance so that it can be modified.

Any public methods can be overwritten allowing you to change internal behavior. Not all methods are public, but hopefully the ones you need.

It is also handy to have addons that will update based on events. Here is an example of an addon that updates based off of some events that the datagrid will throw. For this example we will assume we are waiting for some data to load asynchronously through a service. So we want a spinner until the data is loaded.

```js
	angular.module('ux').factory('listLoader', function () {
		return function (datagrid) {
			datagrid.unwatchers.push(datagrid.scope.$on(ux.datagrid.events.ON_AFTER_UPDATE_WATCHERS, function () {
				if (datagrid.data.length) {
					alert('loading is complete');
				}
			}))
		};
	})
```

##Why use iScroll##
I had my own version of a scroller. However, datagrid is not a scrolling solution, it is a long list rendering solution. Scrolling can be done with any javascript scrolling solution. iScroll is a popular scroller so I used it to leverage the reuse of other libraries with the addition of addons to make them compatible.
Also notice that I only implemented this for the iOS. Android works well with native scrolling.

##Without iScroll##
I found that in some really long lists in a project that I was using the datagrid in that iScroll would crash in Safari on mobile devices. These lists were over 7k items and had very complex rows. However, I made an addition so that we have ux-datagrid-scrollBar.js now so you can make your app work without iScroll and avoid the memory leak.
I am not sure if the memory leak is the fault of Safari or iScroll, but the combination of the two was crashing with an out of memory error on iOS devices.
To use the scrollbar on iOS devices (Android 4.0 devices do not need an extra addon because they already handle much of the scrolling natively) you need to add to the options {scrollModel:{manual:true}}. This will enable touch events to cause the iOS devices to work with their native scroll and still be able to flick. And of course, don't forget to add the scrollBar addon in your addons.

## No JQuery ##
AngularJS Datagrid doesn't have any JQuery dependencies. This helps to keep your application light weight.

## options.chunks.detachDom mode ##
Some browsers cannot handle a large amount of DOM in the page (Cough... IE). So to improve performance in those browsers I added the `detachDom` mode. It still renders the chunks, but will detach the ones out of view.
The number passed to the `detachDom` mode is how many DOM rows to render in each direction of the current visible area. So if your chunks were 10 rows per chunk and you wanted to have one chunk in either direction from the view area then you would set `detachDom = 10`.
I have used this in other places to optimize browser responsiveness. Slower devices benefit from this as well.

## Running Unit Tests Locally ##
You can run the unit tests and samples locally by running

    npm install

inside of the app directory. Then starting the server.

    node server.js

Then you can just pull it up in your browser on "http://localhost:4000/".

##About Addons##

###Addon: disableHoverWhileScrolling (desktop/ux-datagrid-disableHoverWhileScrolling.js) ###
This addon is used to do obviously what it says. This increases performance while scrolling because hover events if there are a lot on the page can affect performance.

###Addon: focusManager (desktop/ux-datagrid-focusManager.js) ###
While this is listed under desktop, it actually has several uses for touch browsers as well. It has built-in functionality to move next and previous through rows selecting similar items.

So for example let's say you have an input in a row. Focus manager on focus would build a selector for that input. Then when you have a button that tells it go to to the next item. It will look up that next item based on the selector from the previous row. If the selector doesn't match it will skip that row. Making it jump over rows that might be headers and such. You can see an example of this in the example app under focus manager.
If you are looking for more of a full focusManager for your whole app you should check out [angular-ux-focusmanager](https://github.com/webux/angular-ux-focusmanager).

To tell the focus manager to go to the next item you would need to get the datagrid instance from the scope. Let's add an example below of a controller with a datagrid.

```html
    <div ng-controller="myController" class="listA">
        <a href="" ng-click="prev()">Prev</a>
        <a href="" ng-click="next()">Next</a>
        <!--// this is the datagrid //-->
        <div ux-datagrid="items" class="datagrid" data-grouped="'children'" data-addons="gridFocusManager">
            <script type="template/html" data-template-name="group" data-template-item="item">
                <div class="group {{fake}}">
                    <div class="col col1">{{item.id}}</div>
                </div>
            </script>
            <script type="template/html" data-template-name="default" data-template-item="item">
                <div class="row">
                    <div class="col col1">{{item.id}}</div>
                    <div class="col col1" data-ng-repeat="col in item.cols"><input type="text" data-ng-model="col.value"></div>
                    <div class="col"></div>
                </div>
            </script>
        </div>
    </div>
```

Using the above HTML, and having a controller like the one below we could access the grid like this.

```js
    function myController($scope) {
        // neither of these functions will work unless there is an active focus element within the grid already.
        $scope.previous = function () {
            // the reason we do this is that the datagrid has it's own scope. So the myController scope needs to get it's child scope to access the datagrid.
            var grid = $scope.$$childHead.datagrid;
            grid.gridFocusManager.focusToPrevRowElement(document.activeElement);
        };
        $scope.next = function () {
            // the reason we do this is that the datagrid has it's own scope. So the myController scope needs to get it's child scope to access the datagrid.
            var grid = $scope.$$childHead.datagrid;
            grid.gridFocusManager.focusToNextRowElement(document.activeElement);
        };
    }
```

Here is a JSFiddle example of how to make your grid work like tables with columns. [ux-angularjs-datagrid tables](http://jsfiddle.net/wesjones/8r4xP/)

###Addon: Collapsible Groups (ux-datagrid-collapsibleGroups.js)###
Collapsible groups is meant to work with grouped data. Given an array like the following.

```js
    [{id:'a', list:[{id:'a.1'}, {'a.2'}]}, {id:'b', list:[{id:'b.1'}, {id:'b.2'}]}]
```

Each Group has sub groups of list. In the template we pass the data-grouped="'list'" so that the datagrid knows which child property to normalize.
The datagrid will convert the structure into a single array like the one below.

```js
    [{id:'a}, {id:'a.1'}, {'a.2'}, {id:'b'}, {id:'b.1'}, {id:'b.2'}]
```

Then we have group `a` and group `b` that are now indexed and no longer actual groups. The `collapseGroups` addon will take this new structure and when a group is clicked it will hide all children from that group and update the heights accordingly.
This will essentially hide all children of that group leaving the group header.

###Addon: Expandable Groups (ux-datagrid-expandableGroups.js)###
While this is easy to confuse with collapsible groups this addon performs very differently. It is optimized to remove rows instead of just hiding them like with `collapsibleGroups`. This has pros and cons to it.

While it will be able to do an `expandAll` and `collapseAll` which the collapsibleGroups cannot do, it cannot change without reloading the data, which means that you can see a flicker of the list. (This is if you are using the built-in styles; if you take the transitions off then the flicker is unnoticeable).

If you need to async load data into expandable groups then this example may work better for you. It shows how to do it without an addon. [jsFiddle Example](http://jsfiddle.net/wesjones/3Wg79/)

###Addon: Expanded Rows (ux-datagrid-expandRows.js)###
This one works in a similar way to collapsible groups. It changes the heights of rows to simulate an effect. In this case it makes the rows taller. Collapsible Groups actually changes their heights to 0 and makes them not display.
Expand rows work with different templates. So you need to setup some options. Given the following grid, see the options.

```html
    <div ux-datagrid="items" class="datagrid" data-grouped="'children'" data-addons="iScrollAddon expandRows"
        data-options="{chunks:{size:10}, expandRows:[{template:'group', cls:'groupExpand'},{template:'default', cls:'expandDefault'},{template:'sub', cls:'expandSub'}]}">
        <script type="template/html" data-template-name="group" data-template-item="item">
            <div class="group {{fake}}" data-ng-click="datagrid.expandRows.toggle($index)">
                <div class="col col1">{{item.id}}</div>
                <div class="col col2">{{$id}}</div>
                <div class="col col4">{{counter}}</div>
                <div class="col col3">height 20px</div>
                <div class="col col5"></div>
            </div>
        </script>
        <script type="template/html" data-template-name="default" data-template-item="item">
            <div class="row {{fake}}" data-ng-click="datagrid.expandRows.toggle($index)">
                <div class="col col1">{{item.id}}</div>
                <div class="col col2">{{$id}}</div>
                <div class="col col4">{{counter}}</div>
                <div class="col col3">height 40px</div>
                <div class="col col5"><input type="text"></div>
            </div>
        </script>
        <script type="template/html" data-template-name="sub" data-template-item="item">
            <div class="sub {{fake}}" data-ng-click="datagrid.expandRows.toggle($index)">
                <div class="col col1">{{item.id}}</div>
                <div class="col col2">{{$id}}</div>
                <div class="col col4">{{counter}}</div>
                <div class="col col3">height 30px</div>
                <div class="col col5"><input type="text"></div>
            </div>
        </script>
    </div>
```

Notice that `expandRows` option gives a `template`, and `cls` property. The `template` property is the name of the template to affect, and the `cls` is the CSS class that gets assigned to that row when it is expanded.
Then the CSS transitions can be done or just popped open as well. Transitions may suffer from chunks that do not transition as well, so in my examples I have just had them snap open. All I needed to do is add a new height to that CSS class so that when it is added the row expands. The datagrid does the rest.

###Addon: Grid Logger (ux-datagrid-gridLogger.js)###
The grid logger is a way to display errors or other log data from the grid. It is set to listen to grid events and log those values. The datagrid doesn't log directly, it throws events for logs.
Notice the options. Grid logger can capture events for all addons, or it can capture them for only items specified.

```html
    <div data-ux-datagrid="items" class="datagrid" data-addons="gridLogger" data-options="{debug:{all:1, Flow:0}}">
        <script type="template/html" data-template-name="default" data-template-item="item">
            <div class="row {{fake}}">
                <div class="text">{{item.id}} {{$id}} {{counter}}</div>
            </div>
        </script>
    </div>
```

With `debug:{all: 1}` you're going to get a lot of log data.
With `debug:{scrollModel:1}` you just get events from the scroll model. So when building your addon this can be handy for debugging.
You can also turn logs off. `debug:{all:1, Flow:0}` turns off the flow control logs, but logs everything else. `debug:{all:1, Flow:0, scrollModel: 0}` turns off Flow and scrollModel, but logs the rest.

###Addon: Infinite Scroll (ux-datagrid-infiniteScroll.js)###
Infinite Scroll needs a couple of hooks to work. First your data to start, then a method that will update the data when it reaches the bottom. This method can be asynchronous because the datagrid watches for its data to change. So once the data changes in the array, it will update.
The `limit` property can be helpful as well. With this it will tell the addon that it should not show the loading row once the limit has reached this value.

```html
    <div data-ux-datagrid="items" class="datagrid" data-options="{infiniteScroll: {limit:200}}" data-addons="iScrollAddon, infiniteScroll, gridLogger">
        <script type="template/html" data-template-name="default" data-template-item="item">
            <div class="row">
                <div class="text">{{item.id}} {{$id}} {{counter}}</div>
            </div>
        </script>
        <script type="template/html" data-template-name="loadingRow" data-template-item="item">
            <div class="row loadingRow"></div>
        </script>
    </div>
```

###Addon: Sort Model (ux-datagrid-sortModel.js)###
Allows you to sort the datagrid by its columns. This has options to sort grouped data as well. When sorting grouped data you may want to sort the groups or the items inside of the groups. By default it sorts the items inside of the groups. To sort the groups you need to set the option `sortModel:{groupSort:true}`.
Here is an example where it has grouped data and you want to sort the groups instead. You can see it setting the options. You then just `toggleSort()` on the `sortModel`.

```html
    <div class="header">
        <div class="row">
            <div class="col sortCol1" data-ng-click="datagrid.sortModel.toggleSort('id')"><div class="{{datagrid.sortModel.getSortStateOf('id')}}">ID</div></div>
            <div class="col sortCol2" data-ng-click="datagrid.sortModel.toggleSort('name')"><div class="{{datagrid.sortModel.getSortStateOf('name')}}">Name</div></div>
            <div class="col sortCol3" data-ng-click="datagrid.sortModel.toggleSort('description')"><div class="{{datagrid.sortModel.getSortStateOf('description')}}">Description</div></div>
            <div class="col sortCol4" data-ng-click="datagrid.sortModel.toggleSort('type')"><div class="{{datagrid.sortModel.getSortStateOf('type')}}">Type</div></div>
            <div class="col sortCol5" data-ng-click="datagrid.sortModel.toggleSort('weight')"><div class="{{datagrid.sortModel.getSortStateOf('weight')}}">oz</div></div>
        </div>
    </div>
    <div class="my-container">
        <div class="listA">
            <!--// this is the datagrid. Add to the sorts the columns that you want sorted. If not added they will not be sortable. To pass methods for your own sorts, pass an object with asc, and desc properties that are sort functions. //-->
            <div data-ux-datagrid="datagrid.sortModel.applySorts(items)" class="datagrid" data-grouped="'children'" data-addons="sortModel" data-options="{sortModel:{groupSort:true, sorts: {id:'none', name:'asc', description:'none', type:'none', weight:'none'}}}">
                <script type="template/html" data-template-name="group" data-template-item="item">
                    <div class="group {{fake}}">
                        <div class="col col1">{{item.id}}</div>
                    </div>
                </script>
                <script type="template/html" data-template-name="default" data-template-item="item">
                    <div class="row {{fake}}">
                        <div class="col sortCol1">{{item.id}}</div>
                        <div class="col sortCol2">{{item.name}}</div>
                        <div class="col sortCol3">{{item.description}}</div>
                        <div class="col sortCol4">{{item.type}}</div>
                        <div class="col sortCol5">{{item.weight}}</div>
                    </div>
                </script>
            </div>
        </div>
    </div>
```

###Get a reference to the datagrid from your scope###
Often times you want to communicate directly with the datagrid in a directive or a controller.
To get a reference to the datagrid instance you just need to listen for its startup event. (v1.1.1)

```js
        $scope.$on(ux.datagrid.events.ON_STARTUP_COMPLETE, function (event, inst) {
            $scope.datagrid = inst;
        });
```

###ng-show###
The datagrid has an incompatibility with `ng-show` because it needs a height when initialized to calculate how many rows to show. Please do not use an `ng-show`, use an `ng-if` which will create the datagrid when it is shown, where an `ng-show` will create it but not allow it to get a height because of the `display:none` of the parent. See issue [#28](https://github.com/webux/ux-angularjs-datagrid/issues/28).

##IE8 Compatibility##
IE8 may work with ux-datagrid by adding some polyfills for emulating missing ES5 features in IE8. First it's required to add [ES5 Shim](https://github.com/es-shims/es5-shim) and also an additional file [Polyfill IE8](/build/latest/IE/Polyfill_IE8.js), located in this repository from this repository.
