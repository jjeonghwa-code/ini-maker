/*!
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the 'License');
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
/* eslint-env browser */
/* globals Mediator, interact */
(function () {
  'use strict';

  var common = {
    commands: {
      ADD_TEXT: 'add-text'
    },
    utils: {
      updatePosition: function (target, x, y) {
        this.setCSSTransform2D(target, x, y);
        target.attr('data-x', x).attr('data-y', y);
      },
      updateSize: function (target, w, h) {
        target.outerWidth(w);
        target.outerHeight(h);
      },
      setCSSTransform2D: function (target, x, y) {
        target.css(
          {
            '-webkit-transform': 'translate(' + x + 'px,' + y + 'px)',
            'transform': 'translate(' + x + 'px,' + y + 'px)'
          });
      },
      setCtnEditable: function (htmlEl, setting) {
        $(htmlEl).find('.inner').attr('contenteditable', setting);
      },
      docExecCmd: function (command, ui, options) {
        return document.execCommand(command, ui || false, options || null);
      },
      makeElResizable: function (selector, options) {
        var self = this;
        options = options || {};
        interact(selector)
          .resizable({
            preserveAspectRatio: options.preserveAspectRatio || false,
            edges: {
              left: options.left || false,
              top: options.top || false,
              right: options.right || false,
              bottom: options.bottom || false
            },
            invert: options.invert || 'reposition'
          })
          .on('resizemove', function (event) {
            var target = $(event.target);
            var x = parseFloat(target.attr('data-x') || 0);
            var y = parseFloat(target.attr('data-y') || 0);

            target.width(event.rect.width);
            target.height(event.rect.height);

            x += event.deltaRect.left;
            y += event.deltaRect.top;

            self.updatePosition(target, x, y);

            if (options.action && options.action === 'resizeSelected') {
              self.updatePosition(target.siblings('.element'), x, y);
              self.updateSize(
                target.siblings('.element'), target.outerWidth(), target.outerHeight()
              );
            }
          });
      },
      makeElDraggable: function (selector, options) {
        options = options || {};
        var self = this;
        interact(selector, {
          context: options.context || document
        })
          .draggable({
            inertia: options.inertia || false,
            autoScroll: options.autoScroll || true,
            onstart: function (event) {
              event.target.style.pointerEvents = 'none';
            },
            onmove: function (event) {
              var target = $(event.target);
              var x = parseFloat(target.attr('data-x') || 0) + event.dx;
              var y = parseFloat(target.attr('data-y') || 0) + event.dy;

              self.updatePosition(target, x, y);

              if (options.action && options.action === 'moveSelected') {
                self.updatePosition(target.siblings('.element'), x, y);
              }
            },
            onend: function (event) {
              event.target.style.pointerEvents = 'auto';
            }
          });
      },
      getElemFromTpl: function (tplSelector) {
        return $(
          $.parseHTML($(tplSelector).html().trim())
        );
      }
    }
  };

  var canvasCtrl = new Mediator();
  var uiCtrl = new Mediator();

  (function (canvasCtrl) {
    var overlays = $('#overlays');
    var selectionBox = common.utils.getElemFromTpl('#tpl--selection-box');
    var selectedPageCtn;
    var activeEl;

    /**
     * When anything but currently active element is clicked,
     * the active element will be inactive.
     * @param {Event} event - Get touched target from this event
     */
    function onCanvasPageClick(event) {
      selectedPageCtn = $(this).find('.elements');
      var target = $(event.target).closest('.element');
      if (activeEl) {
        if (!target.is(activeEl)) {
          setElActive(activeEl, false);
        }
      }
      if (target.is('.element')) {
        setElActive(target, true);
      }
    }

    /**
     * When subscribed 'addPage' event is published
     * @param {object} pageEl - jQuery object of page elem
     */
    function onAddPage(pageEl) {
      pageEl.click(onCanvasPageClick);
      pageEl.click();
    }

    function onRmItem() {
      if (activeEl) {
        activeEl.remove();
        activeEl = null;
      } else if (selectedPageCtn) {
        selectedPageCtn.closest('.page').remove();
        selectedPageCtn = null;
      }
      selectionBox.remove();
    }

    canvasCtrl.subscribe('addPage', onAddPage);
    canvasCtrl.subscribe('removeItem', onRmItem);
    canvasCtrl.subscribe('addRichTextEl', addRichTextEl);

    common.utils.makeElResizable('.page',
      {right: '.resize-handle', bottom: '.resize-handle'});
    common.utils.makeElResizable('.selection-box', {
      top: '.t, .lt, .rt',
      right: '.r, .rt, .rb',
      bottom: '.b, .lb, .rb',
      left: '.l, .lt, .lb',
      action: 'resizeSelected'
    });
    common.utils.makeElDraggable('.selection-box', {
      action: 'moveSelected'
    });

    /**
     * When an element is focused/blur, show/hide the selection box
     * @param {object} elem - jQuery object
     * @param {boolean} wrap - show or hide the selection box
     */
    function setWrapSelectionBox(elem, wrap) {
      wrap = typeof wrap === 'undefined' ? true : wrap;
      var x = parseFloat(elem.attr('data-x') || 0);
      var y = parseFloat(elem.attr('data-y') || 0);

      var pagePos = selectedPageCtn.closest('.page').position();
      var dx = pagePos.left;
      var dy = pagePos.top;

      if (wrap) {
        x += dx;
        y += dy;

        elem.prevElem = elem.prev('.element');
        elem.nextElem = elem.next('.element');

        overlays.append(selectionBox, elem);
        common.utils.updateSize(selectionBox, elem.outerWidth(), elem.outerHeight());
        common.utils.updateSize(elem, elem.outerWidth(), elem.outerHeight());
      } else {
        x -= dx;
        y -= dy;
        selectionBox.remove();
        if (elem.prevElem && elem.prevElem.length) {
          elem.insertAfter(elem.prevElem);
        } else if (elem.nextElem && elem.nextElem.length) {
          elem.insertBefore(elem.nextElem);
        } else {
          selectedPageCtn.append(elem);
        }
      }
      common.utils.updatePosition(elem, x, y);
      common.utils.updatePosition(selectionBox, x, y);
    }

    /**
     * Active elements are meant to be selected
     * @param {object} elem - jQuery object
     * @param {boolean} active - make the elem active or inactive
     */
    function setElActive(elem, active) {
      common.utils.setCtnEditable(elem, active);
      if (active) {
        activeEl = elem.addClass('active');
        setWrapSelectionBox(elem);
        if (activeEl.hasClass('text')) {
          uiCtrl.publish('showHotTools', {action: true, type: 'text'});
        }
      } else {
        elem.removeClass('active');
        activeEl = null;
        setWrapSelectionBox(elem, false);
        uiCtrl.publish('showHotTools', {action: false});
      }
    }

    /**
     * Create new common node for specific use
     * @param {string} nodeName - name of the node, mostly 'div'
     * @param {object} cssOptions - wrapped with css styles
     * @return {object} - built jQuery object
     */
    function createNode(nodeName, cssOptions) {
      var node = $(document.createElement('div'));
      var innerNode = $(document.createElement(nodeName)).addClass('inner');
      node.append(innerNode);

      common.utils.makeElDraggable('.element', {
        context: selectedPageCtn.get(0)
      });

      return node.css(cssOptions || {}).addClass('element');
    }

    /**
     * Create a new text element
     */
    function addText() {
      var textNode = createNode('div');
      textNode.addClass('text').find('.inner').text('请输入文本内容');
      if (activeEl) {
        setElActive(activeEl, false);
      }
      setElActive(textNode, true);
      textNode.find('.inner').focus();
    }

    /**
     * Create any rich text element like text, pictures, etc
     * @param {string} command - used to specifically create an element
     */
    function addRichTextEl(command) {
      if (!selectedPageCtn) {
        return;
      }
      switch (command) {
        case common.commands.ADD_TEXT:
          addText();
          break;
        default:
          break;
      }
    }
  })(canvasCtrl);

  (function (canvasCtrl) {
    var tbRichText = $('#tb--rich-text');

    /**
     * Handle it when user click a button on the toolbar
     */
    function onTbRichTextClick() {
      var targetEl = $(this);
      var command = targetEl.attr('data-command');
      canvasCtrl.publish('addRichTextEl', command);
    }

    tbRichText.children().click(onTbRichTextClick);
  })(canvasCtrl);

  (function (canvasCtrl) {
    var addPageBtn = $('#add-page');
    var canvasPages = $('#canvas-pages');
    var rmItemBtn = $('#remove-item');
    var hotTools = $('.hot-tools');


    /**
     * When right-bottom add-page button is clicked
     */
    function onAddPageBtnClick() {
      var pageEl = common.utils.getElemFromTpl('#tpl--page');
      var lastPage = $('.page').last();
      if (lastPage.length) {
        pageEl.css('top', lastPage.position().top + lastPage.height() + 40);
      }
      canvasPages.append(pageEl);
      canvasCtrl.publish('addPage', pageEl);
    }

    function onRmItemBtnClick() {
      canvasCtrl.publish('removeItem');
    }

    function showHotTools(options) {
      options = options || {};
      if (options.action) {
        hotTools.filter('.'+options.type).addClass('show');
      } else {
        hotTools.removeClass('show');
      }
    }

    function onHotToolsClick() {
      var extraAgm;
      var self = $(this);
      var command = self.data('command');
      document.execCommand(command, false, extraAgm);
    }
    uiCtrl.subscribe('showHotTools', showHotTools);
    addPageBtn.click(onAddPageBtnClick);
    rmItemBtn.click(onRmItemBtnClick);
    hotTools.children().click(onHotToolsClick);
  })(canvasCtrl);
})();
