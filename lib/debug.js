/**
 * [debug] M站打印日志的面板
 * 地址栏带有debug参数可以渲染日志面板（无debug参数不渲染相关dom）
 * 主要方便查看手机浏览器上的调试信息，上线时去掉相关信息即可（也可以不去掉，便于线上查看错误信息，反正不带debug参数不会渲染不会有性能损耗）
 * @type {RegExp}
 */
'use strict'
honey.def('lib:jquery', function(H){
    var content, debug = /(\?|&)debug/im.test(location.href) ;

    function init(){
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = '.mg-debug-panel{box-sizing:border-box;position: fixed;'+
            'bottom:0;left:0;width:100%;'+
            'box-shadow:0 -5px .5rem rgba(0,0,0,.3);padding:.2rem .2rem;'+
            'background:#fff;color:#000;font-size:10px;z-index: 9999;}'+
            '.mg-debug-panel>.mg-debug-content{box-sizing:border-box;'+
            'overflow:auto;height:10rem;overflow:auto;'+
            'background:#fff;color:#262626;}'+
            '.mg-debug-toggle{border-radius:5px;position:absolute;right:0;top:-.8rem;height:1rem;line-height:1rem;'+
            'font-size:12px;width:4rem;text-align:center;background:#fff;color:#000;box-shadow:0 -10px .3rem rgba(0,0,0,.2);}'+
            '.mg-debug-panel>.mg-debug-content>p{margin-top:.1rem;border-bottom:1px dotted #eee;}'+
            '.mg-debug-panel>.mg-debug-content>p>span{display:inline-block;min-width:1.7rem;color:#585858;}';
        document.body.appendChild(style);

        var panel = document.createElement('div');
        panel.show = true;
        panel.className = 'mg-debug-panel';

        var toggle = document.createElement('div');
        toggle.className = 'mg-debug-toggle';
        toggle.innerHTML = 'close';
        toggle.addEventListener('click',function(){
            if(!panel.show){
                panel.style.transform = 'translate3d(0,0,0)';
                panel.style.webkitTransform = 'translate3d(0,0,0)';
                toggle.innerHTML = 'close';
                panel.show = true;
            }else{
                panel.style.transform = 'translate3d(0,5.7rem,0)';
                panel.style.webkitTransform = 'translate3d(0,5.7rem,0)';
                toggle.innerHTML = 'open';
                panel.show = false;
            }
        });
        panel.appendChild(toggle);

        content = document.createElement('div');
        content.className = 'mg-debug-content';
        panel.appendChild(content);
        document.body.appendChild(panel);
    }

    debug && init();

    function format(date){
        return date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()+':'+date.getMilliseconds();
    }

    H._debug = {
        log(msg,color){
            if(!debug)
                return;
            var p = document.createElement('p');
            p.innerHTML = '<span>'+format(new Date())+'</span> :&nbsp; '+function(){
                var type = Object.prototype.toString.call(msg);
                return (type === '[object Object]' || type === '[object Array]') ? JSON.stringify(msg):msg;
            }();

            color && (p.style.color = color);
            content.appendChild(p);
            content.scrollTop = content.scrollHeight;
            console.log(msg);
        },
        error(msg){
            this.log(msg,'red');
        }
    }
})
