/**
 * @file:fsmonitor.es6
 * @author:yanglang
 * @description 用于统计SPA应用的首屏渲染时间并上报
 * 在某事件时机点进行触发，首先设定你要加载的页面有几个事件时机点(__MONITOR__.set(page,params)方法)，
 * 然后在这些时机点位置调用__MONITOR__.trigger(page)进行触发，达到指定次数则代表页面获取数据完成
 */
import debug from './debug.es6';

if(typeof window.__MONITOR__ === 'undefined'){
	window.__MONITOR__ = {
        _START_:new Date(),
        location:location.href.split('#')[1]||'/'
    };
}

var tmp = Object.assign({},{
	end:false,
	cancel:false,
	/**
	 * [map 页面参数映射]
	 * key 页面名称
	 * value 
	 * 		route 页面的路由静态部分，用于匹配是否是针对当前页进行渲染统计
	 * 		count 渲染完成的事件时机点，对于类似Promise中的when，多个异步加载事件count>1，当trigger达到count次数时，则代表获取数据完成
	 * 不是非得在这进行配置，在相应模块文件的ready方法里先调用set方法设置也是一样的
	 * __MONITOR__.set('login',{count:2,route:'/login'});
     * __MONITOR__.trigger('login');
	 */
	map:{
		channel:{
			route:'/channel',
			count:2
		},
		play:{
			route:'/b',
			count:1
		},
		videolist:{
			route:'/l',
			count:1
		},
		splash:{
			route:'/splash',
			count:1
		}
	},
	/**
	 * @method {{set}} 设置页面参数
	 * @param  {[type]} page  [页面名称]
	 * @param  {[type]} param [页面参数]
	 * @return {[__MONITOR__]} [返回自身，支持链式调用]
	 */
	set(page,param){
		this.map[page] = Object.assign({},this.map[page],param);
		return this;
	},
	/**
	 * @method {{trigger}} 调用触发，自动统计次数
	 * @param  {[type]} page [页面名称]
	 * @param  timeout 超时时间 有时候vue还未生成img的dom对象，所以需要切到下一个时间线上去统计
	 * @return {[__MONITOR__]} [返回自身，支持链式调用]
	 */
	trigger(page,timeout=0){
		let m = this.map[page];
		if(!m || this.end || (this.location !== window.location.href && window.location.href.split('#')[1] != '/splash')){
			//前一期尚未上报，用户就点击另外的链接跳转了，所以不必再上报，设置取消cancel
			this.cancel = true;
			return;
		}
		m.c || (m.c = 0);
		m.c += 1;
		if(m.c>=m.count){
			setTimeout(()=>{
				first_screen(page,timeout);
			},timeout);
			this.end = true;
		}
		return this;
	}
},__MONITOR__);

window.__MONITOR__ = tmp;

function first_screen (page,timeout) {
		var imgs = document.getElementsByTagName("img"), fs = __MONITOR__._START_, now = +new Date();
	var fsItems = [], that = this;
	//console.log('imgs',imgs.length);
    function getOffsetTop(elem) {
        var top = 0;
        top = window.pageYOffset ? window.pageYOffset : document.documentElement.scrollTop;
        try{
            top += elem.getBoundingClientRect().top;    
        }catch(e){

        }finally{
            return top;
        }

    }
    var loadEvent = function() {
        //gif避免
        if (this.removeEventListener) {
            this.removeEventListener("load", loadEvent, false);
        }
        fsItems.push({
            img : this,
            time : +new Date
        });
    }
    for (var i = 0; i < imgs.length; i++) {
        (function() {
            var img = imgs[i];
            if (img.addEventListener) {
            	//console.log('com',img.complete);
                !img.complete && img.addEventListener("load", loadEvent, false);
            } else if (img.attachEvent) {

                img.attachEvent("onreadystatechange", function() {
                    if (img.readyState == "complete") {
                        loadEvent.call(img, loadEvent);
                    }

                });
            }

        })();
    }

    function firstscreen_time() {
        //console.log(fsItems);
        var sh = document.documentElement.clientHeight;
        //console.log('sh',sh);
        for (var i = 0; i < fsItems.length; i++) {
            var item = fsItems[i], img = item['img'], time = item['time'], top = getOffsetTop(img);
            //console.log('top',top);
            if (top > 0 && top < sh) {
                fs = time > fs ? time : fs;
            }
        }
        return fs;
    } 
    window.addEventListener('load', function() {
    	if(__MONITOR__.cancel)
    		return;
    	var _fs = firstscreen_time(), t = 0;
    	debug.log('图片是否在这之前已全部加载？==== '+(_fs == __MONITOR__._START_),'green');
    	if(_fs == __MONITOR__._START_)
    		t = now - __MONITOR__._START_ - timeout;
    	else
    		t = _fs - __MONITOR__._START_;
		MgStat.log('fsrender',{
			t:t,
			p:page
		});
		debug.log('首屏渲染时间 fsrender time:'+t,'green');
	});
}
