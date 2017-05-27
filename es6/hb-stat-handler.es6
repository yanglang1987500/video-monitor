/**
 * HBStatHandler HB上报handler，由VideoMonitor统一进行事件通知，每秒一次，此模块只专注于上报心跳
 * 上报时机:心跳事件,一开始在 play 事件发生以后的第 15 秒、45 秒、60 秒分别上报一次,之后稳定在每 2 分钟上报一次 
 * 当播放器处理暂停状态时，停止计时，且暂停上报心跳。待用户继续播放后继续上报（这些VideoMonitor都有处理）
 * @author yanglang
 */
honey.def('es6_video-monitor',H => {

    var aver = 'imgotv-ipad-5.0',
        pver = 'imgotv-player-1.0',
        version = navigator.userAgent.toLowerCase().match(/cpu os ([0-9_]+)/),
        version = version ? version[1]: '',
        sver = 'ipad-' + version.replace(/_/g, '.'),
        url = 'http://padweb.v0.mgtv.com/hb.php', 
        idx = 0, 
        stk = new STK.start();

	var isPad = /(iPad|Android)/.test(navigator.userAgent);
	var V = window.VIDEOINFO;
	var base = {
		act:'hb',
		cf: '', //cf 正片与否
        vts: '',
        pt:V.pt, //播放视频种类
		vid:V.vid || '', //vid
		plid:V.cid || '', //plid
		pver:pver,
		cid:V.rid || '', //cid
		def: 1,//pad默认标清
		pay: '',
		istry:0,//pad没有试看
		idx:0,
		bdid:window.PLAYLIST_INFO ? window.PLAYLIST_INFO.id : '',
		ap:0,
		ch:STK.$.getRequest('cxid'),
		ct:'',
		td:'',
		suuid:'',
		ht:'',//	2-退出时的最后上报的心跳，3-15s心跳 4-45s心跳,5-60秒心跳,6-2分钟心跳
		bsid:V.sid || '',
		cpn:V.cpn
	};

	class HBStatHandler{
		constructor(){

		}

		/**
		 * @method {{ended}} 正片播放结束心跳上报
		 * @param  {[type]} e         [事件对象]
		 * @param  {[type]} videoInfo [正片信息]
		 * @return {[type]}           [description]
		 */
		ended(e,videoInfo){
			H._debug.log('HBStatHandler ended-----');
			var data = $.extend(base,{
				cf:videoInfo.info.clip_type,
				vts:videoInfo.info.duration,
				pay:videoInfo.info.paymark,
				ct:e.target.currentTime,
                suuid:videoInfo.suuid,
				idx:++idx,
				ht:2
			});
			stk.create(data,url);
		}

		/**
		 * @method {{count}} 计数回调
		 * @param  {[type]} e         [事件对象]
		 * @param  {[type]} videoInfo [正片信息 内含当前观看时长count]
		 * @return {[type]}           [description]
		 */
		count(e,videoInfo){
			//H._debug.log('HBStatHandler count-----'+videoInfo.count);
			var data = $.extend(base,{
				cf:videoInfo.info.clip_type,
				vts:videoInfo.info.duration,
				pay:videoInfo.info.paymark,
                suuid:videoInfo.suuid,
				ct:e.target.currentTime
			});
			//15秒上报
			if(videoInfo.count === 15){
            	H._debug.log('HBStatHandler 15秒上报');
				data.idx = ++idx;
				data.ht = 3;
				stk.create(data,url);
				return;
			}
			//45秒上报
			if(videoInfo.count === 45){
            	H._debug.log('HBStatHandler 45秒上报');
				data.idx = ++idx;
				data.ht = 4;
				stk.create(data,url);
				return;
			}
			//60秒上报
			if(videoInfo.count === 60){
            	H._debug.log('HBStatHandler 60秒上报');
				data.idx = ++idx;
				data.ht = 5;
				stk.create(data,url);
				return;
			}
			//60秒后每2分钟上报一次
			if(((videoInfo.count-60)/60)%2==0){
            	H._debug.log('HBStatHandler 每2分钟上报一次 videoInfo.count='+videoInfo.count);
				data.idx = ++idx;
				data.ht = 6;
				stk.create(data,url);
				return;
			}
		}
	}

	//调用VideoMonitor的listen方法进行handler监听注册
	H.VideoMonitor.listen(new HBStatHandler());
});