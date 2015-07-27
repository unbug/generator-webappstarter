define(function(require, exports, module) {
  var randomList = require('util/RandomList');
  var impress = window.impress;

  var ww = window.innerWidth,
    wh = window.innerHeight;
  var Generator = {};

  function initImpress(option){
    option = option || {};
    if(!option.body || !option.root || !impress){ return null;}
    var imp,
      id = 'impress_generator_'+new Date().getTime();
    option.root.id = id;
    imp = new impress(id,{
      body: option.body,
      resizeDrive: false,// keep current step after resize viewport
      hashMark: false, //change the location hash
      clickDrve: false, //enable clik to drive steps
      keyboardDrve: false,//enable keyboard to drive steps
      touchDrive: false,//enable touch to drive steps
      anchorDrive: false//enable anchor to drive steps
    });

    !option.lazy && imp.init();

    return imp;
  }

  function getInstance(attrs,ioption){
    var instance = {};
    instance.attrs = attrs || [];
    instance.impress = ioption?initImpress(ioption):null;

    return instance;
  }

  function setAttr(el,attr){
    if(el && attr){
      el.setAttribute('data-x',attr.x || 0);
      el.setAttribute('data-y',attr.y || 0);
      el.setAttribute('data-z',attr.z || 0);
      el.setAttribute('data-rotate-x',attr.rx || 0);
      el.setAttribute('data-rotate-y',attr.ry || 0);
      el.setAttribute('data-rotate-z',attr.rz || 0);
      el.setAttribute('data-scale',attr.scale || 1);
    }
  }

  Generator.circle = function(option){
    option = option || {};
    if(!option.el && !option.total){ return; }
    var el = option.el,
      dir = option.direction || 'normal',
      _dirs = [{x: 1,y: 1,de: -1},{x: 1,y: 1,de: 1},{x: -1,y: -1,de: 1},{x: -1,y: -1,de: -1}],
      dirs = {
        'left-top': _dirs[0],
        'left-bottom': _dirs[1],
        'right-top': _dirs[2],
        'right-bottom': _dirs[3],
        'normal': _dirs[2],
        'random': randomList(_dirs,1,null,10)[0]
      },
      zoom = option.zoom || 'normal',
      zooms = {
        'zoom-in': 1,
        'zoom-out': -1,
        'normal': 0,
        'random': randomList([0,1,-1],1,null,10)[0]
      },
      total = option.total,
      width = option.maxWidth || ww,
      height = option.maxHeight || wh,
      children,attrs = [],i = 0;

    if(el){
      children = el.children;
      total = children.length;
    }

    var c = ( height + ((zoom=='zoom-in'||zooms[zoom]==1)?height:0) ) * total,
      offsetX = parseInt(width / 2, 10),
      offsetY = parseInt(height / 2, 10),
      r = parseInt(c / 2 / Math.PI + height / 2, 10),
      de = 0,
      deStep = 360 / total,
      ra, x,y;

    for(i;i<total;i++){
      var cel = children && children[i];
      de = deStep * i * (dirs[dir]||dirs['normal'])['de'];
      ra = (360 - de) * Math.PI / 180;
      x = parseInt(offsetX + Math.cos(ra) * r, 10);
      y = parseInt(offsetY - Math.sin(ra) * r, 10);
      var attr = {
        x: x*(dirs[dir]||dirs['normal'])['x'],
        y: y*(dirs[dir]||dirs['normal'])['y'],
        z: 0,
        rx: 0,
        ry: 0,
        rz: de,
        scale: 1+( (zooms[zoom] || zooms['normal']) * i/total )
      };
      attrs.push(attr);
      setAttr(cel,attr);
    }

    return getInstance(attrs,option.impress);
  }
  Generator.horizontal = function(option){
    option = option || {};
    if(!option.el && !option.total){ return; }
    var el = option.el,
      dir = option.direction || 'normal',
      dirs = {
        'from-right': 1,
        'from-left': -1,
        'normal': 1,
        'random': Math.round(Math.random())?-1:1
      },
      zoom = option.zoom || 'normal',
      zooms = {
        'zoom-in': 1,
        'zoom-out': -1,
        'normal': 0,
        'random': randomList([0,1,-1],1,null,10)[0]
      },
      total = option.total,
      width = option.maxWidth || ww,
      height = option.maxHeight || wh,
      children,attrs = [],i = 0;

    if(el){
      children = el.children;
      total = children.length;
    }

    for(i;i<total;i++){
      var cel = children && children[i];
      var attr = {
        x: i*width*(dirs[dir]||dirs['normal'])*(zoom=='normal'||zooms[zoom]==0?1.4:2),
        y: 0,
        z: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        scale: 1+( (zooms[zoom] || zooms['normal']) * i/total )
      };
      attrs.push(attr);
      setAttr(cel,attr);
    }

    return getInstance(attrs,option.impress);
  }

  Generator.vertical = function(option){
    option = option || {};
    if(!option.el && !option.total){ return; }
    var el = option.el,
      dir = option.direction || 'normal',
      dirs = {
        'from-bottom': 1,
        'from-up': -1,
        'normal': 1,
        'random': Math.round(Math.random())?-1:1
      },
      zoom = option.zoom || 'normal',
      zooms = {
        'zoom-in': 1,
        'zoom-out': -1,
        'normal': 0,
        'random': randomList([0,1,-1],1,null,10)[0]
      },
      total = option.total,
      width = option.maxWidth || ww,
      height = option.maxHeight || wh,
      children,attrs = [],i = 0;

    if(el){
      children = el.children;
      total = children.length;
    }

    for(i;i<total;i++){
      var cel = children && children[i];
      var attr = {
        x: 0,
        y: i*height*(dirs[dir]||dirs['normal'])*(zoom=='normal'||zooms[zoom]==0?1.2:1.3),
        z: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        scale: 1+( (zooms[zoom] || zooms['normal']) * i/total )
      };
      attrs.push(attr);
      setAttr(cel,attr);
    }

    return getInstance(attrs,option.impress);
  }

  Generator.diagonal = function(option){
    option = option || {};
    if(!option.el && !option.total){ return; }
    var el = option.el,
      dir = option.direction || 'normal',
      _dirs = [{x: -1,y: -1},{x: -1,y: 1},{x: -1,y: 1},{x: 1,y: 1}],
      dirs = {
        'top-left': _dirs[0],
        'top-right': _dirs[1],
        'bottom-left': _dirs[2],
        'bottom-right': _dirs[3],
        'normal': _dirs[3],
        'random': randomList(_dirs,1,null,10)[0]
      },
      zoom = option.zoom || 'normal',
      zooms = {
        'zoom-in': 1,
        'zoom-out': -1,
        'normal': 0,
        'random': randomList([0,1,-1],1,null,10)[0]
      },
      total = option.total,
      width = option.maxWidth || ww,
      height = option.maxHeight || wh,
      children,attrs = [],i = 0;

    if(el){
      children = el.children;
      total = children.length;
    }

    for(i;i<total;i++){
      var cel = children && children[i];
      var attr = {
        x: i*width*(dirs[dir]||dirs['normal'])['x']*(zoom=='normal'||zooms[zoom]==0?1.2:1.6),
        y: i*height*(dirs[dir]||dirs['normal'])['y']*(zoom=='normal'||zooms[zoom]==0?1.2:1.6),
        z: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        scale: 1+( (zooms[zoom] || zooms['normal']) * i/total )
      };
      attrs.push(attr);
      setAttr(cel,attr);
    }

    return getInstance(attrs,option.impress);
  }
  Generator.snake = function(option){
    option = option || {};
    if(!option.el && !option.total){ return; }
    var el = option.el,
      zoom = option.zoom || 'normal',
      zooms = {
        'zoom-in': 1,
        'zoom-out': -1,
        'normal': 0,
        'random': randomList([0,1,-1],1,null,10)[0]
      },
      total = option.total,
      width = option.maxWidth || ww,
      height = option.maxHeight || wh,
      children,attrs = [],i = 0;

    if(el){
      children = el.children;
      total = children.length;
    }

    for(i;i<total;i++){
      var cel = children && children[i];
      var attr = {
        x: i*width*1.3,
        y: i*height*1.3,
        z: 0,
        rx: 135*(i%2?0:1),
        ry: 135*(i%2?1:0),
        rz: i*360/total,
        scale: 1+( (zooms[zoom] || zooms['normal']) * i/total )
      };
      attrs.push(attr);
      setAttr(cel,attr);
    }

    return getInstance(attrs,option.impress);
  }

  Generator.random = function(option){
    var anim = ['circle','horizontal','vertical','diagonal','snake'];
    return Generator[randomList(anim,1,null,10)](option);
  }

  return Generator;
});
