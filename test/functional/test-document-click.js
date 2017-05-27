/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import '../../src/service/document-click';


describes.sandboxed('ClickHandler', {}, () => {
  let event;

  beforeEach(() => {
    event = {
      target: null,
      defaultPrevented: false,
    };
    event.preventDefault = function() {
      event.defaultPrevented = true;
    };
  });

  describes.fakeWin('non-embed', {
    win: {
      location: 'https://www.google.com/some-path?hello=world#link',
    },
    amp: true,
  }, env => {
    let win, doc;
    let handler;
    let handleNavSpy;
    let handleCustomProtocolSpy;
    let winOpenStub;
    let scrollIntoViewStub;
    let replaceStateForTargetStub;
    let replaceStateForTargetPromise;
    let anchor;
    let elementWithId;
    let anchorWithName;

    beforeEach(() => {
      win = env.win;
      doc = win.document;

      handler = win.services.clickhandler.obj;
      handler.isIframed_ = true;
      handleNavSpy = sandbox.spy(handler, 'handleNavClick_');
      handleCustomProtocolSpy = sandbox.spy(handler,
          'handleCustomProtocolClick_');
      win.open = function() {};
      winOpenStub = sandbox.stub(win, 'open', () => {
        return {};
      });
      const viewport = win.services.viewport.obj;
      scrollIntoViewStub = sandbox.stub(viewport, 'scrollIntoView');
      const history = win.services.history.obj;
      replaceStateForTargetPromise = Promise.resolve();
      replaceStateForTargetStub = sandbox.stub(history,
          'replaceStateForTarget', () => replaceStateForTargetPromise);

      anchor = doc.createElement('a');
      anchor.href = 'https://www.google.com/other';
      doc.body.appendChild(anchor);
      event.target = anchor;

      elementWithId = doc.createElement('div');
      elementWithId.id = 'test';
      doc.body.appendChild(elementWithId);

      anchorWithName = doc.createElement('a');
      anchorWithName.setAttribute('name', 'test2');
      doc.body.appendChild(anchorWithName);
    });

    describe('discovery', () => {
      it('should select a direct link', () => {
        handler.handle_(event);
        expect(handleNavSpy).to.be.calledOnce;
        expect(handleNavSpy).to.be.calledWith(event, anchor);
        expect(handleCustomProtocolSpy).to.be.calledOnce;
        expect(handleCustomProtocolSpy).to.be.calledWith(event, anchor);
      });

      it('should NOT handle custom protocol when not iframed', () => {
        handler.isIframed_ = false;
        handler.handle_(event);
        expect(handleCustomProtocolSpy).to.not.be.called;
      });

      it('should discover a link from a nested target', () => {
        const target = doc.createElement('span');
        anchor.appendChild(target);
        event.target = target;
        handler.handle_(event);
        expect(handleNavSpy).to.be.calledOnce;
        expect(handleNavSpy).to.be.calledWith(event, anchor);
        expect(handleCustomProtocolSpy).to.be.calledOnce;
        expect(handleCustomProtocolSpy).to.be.calledWith(event, anchor);
      });

      it('should NOT proceed if event is cancelled', () => {
        event.preventDefault();
        handler.handle_(event);
        expect(handleNavSpy).to.not.be.called;
        expect(handleCustomProtocolSpy).to.not.be.called;
      });

      it('should ignore a target without link', () => {
        const target = doc.createElement('span');
        doc.body.appendChild(target);
        event.target = target;
        handler.handle_(event);
        expect(handleNavSpy).to.not.be.called;
        expect(handleCustomProtocolSpy).to.not.be.called;
      });

      it('should ignore a link without href', () => {
        anchor.removeAttribute('href');
        handler.handle_(event);
        expect(handleNavSpy).to.not.be.called;
        expect(handleCustomProtocolSpy).to.not.be.called;
      });
    });

    describe('link expansion', () => {
      it('should expand a link', () => {
        anchor.href = 'https://www.google.com/link?out=QUERY_PARAM(hello)';
        anchor.setAttribute('data-amp-replace', 'QUERY_PARAM');
        handler.handle_(event);
        expect(anchor.href).to.equal('https://www.google.com/link?out=world');
        expect(handleNavSpy).to.be.calledOnce;
      });

      it('should only expand with whitelist', () => {
        anchor.href = 'https://www.google.com/link?out=QUERY_PARAM(hello)';
        handler.handle_(event);
        expect(anchor.href).to.equal(
            'https://www.google.com/link?out=QUERY_PARAM(hello)');
        expect(handleNavSpy).to.be.calledOnce;
      });
    });

    describe('when linking to ftp: protocol', () => {
      beforeEach(() => {
        anchor.href = 'ftp://example.com/a';
      });

      it('should always open in _blank when embedded', () => {
        handler.handle_(event);
        expect(winOpenStub).to.be.calledOnce;
        expect(winOpenStub).to.be.calledWith('ftp://example.com/a', '_blank');
        expect(event.defaultPrevented).to.be.true;
      });

      it('should not do anything not embedded', () => {
        handler.isIframed_ = false;
        handler.handle_(event);
        expect(winOpenStub).to.not.be.called;
        expect(winOpenStub).to.not.be.calledWith('ftp://example.com/a', '_blank');
        expect(event.defaultPrevented).to.be.false;
      });
    });

    describe('when linking to custom protocols e.g. whatsapp:', () => {
      beforeEach(() => {
        handler.isIosSafari_ = true;
        anchor.href = 'whatsapp://send?text=hello';
      });

      it('should open link in _top on Safari iOS when embedded', () => {
        handler.handle_(event);
        expect(winOpenStub).to.be.calledOnce;
        expect(winOpenStub.calledWith(
            'whatsapp://send?text=hello', '_top')).to.be.true;
        expect(event.defaultPrevented).to.be.true;
      });

      it('should not do anything on when not embedded', () => {
        handler.isIframed_ = false;
        handler.handle_(event);
        expect(winOpenStub).to.not.be.called;
        expect(winOpenStub).to.not.be.calledWith(
            'whatsapp://send?text=hello', '_top');
        expect(event.defaultPrevented).to.be.false;
      });

      it('should not do anything for mailto: protocol', () => {
        anchor.href = 'mailto:hello@example.com';
        handler.handle_(event);
        expect(winOpenStub).to.not.be.called;
        expect(event.defaultPrevented).to.be.false;
      });

      it('should not do anything on other non-safari iOS', () => {
        handler.isIosSafari_ = false;
        handler.handle_(event);
        expect(winOpenStub).to.not.be.called;
        expect(event.defaultPrevented).to.be.false;
      });

      it('should not do anything on other platforms', () => {
        handler.isIosSafari_ = false;
        handler.handle_(event);
        expect(winOpenStub).to.not.be.called;
        expect(event.defaultPrevented).to.be.false;
      });
    });

    describe('when linking to a different origin or path', () => {
      it('should not do anything on path change', () => {
        anchor.href = 'https://www.google.com/some-other-path';
        handler.handle_(event);
        expect(event.defaultPrevented).to.be.false;
        expect(winOpenStub).to.not.be.called;
        expect(scrollIntoViewStub).to.not.be.called;
        expect(anchor.getAttribute('target')).to.be.null;
      });

      it('should not do anything on origin change', () => {
        anchor.href = 'https://maps.google.com/some-path#link';
        handler.handle_(event);
        expect(event.defaultPrevented).to.be.false;
        expect(winOpenStub).to.not.be.called;
        expect(scrollIntoViewStub).to.not.be.called;
        expect(anchor.getAttribute('target')).to.be.null;
      });

      it('should not do anything when there is no hash', () => {
        anchor.href = 'https://www.google.com/some-path';
        handler.handle_(event);
        expect(event.defaultPrevented).to.be.false;
        expect(winOpenStub).to.not.be.called;
        expect(scrollIntoViewStub).to.not.be.called;
        expect(anchor.getAttribute('target')).to.be.null;
      });

      it('should not do anything on a query change', () => {
        anchor.href = 'https://www.google.com/some-path?hello=foo#link';
        handler.handle_(event);
        expect(event.defaultPrevented).to.be.false;
        expect(winOpenStub).to.not.be.called;
        expect(scrollIntoViewStub).to.not.be.called;
        expect(anchor.getAttribute('target')).to.be.null;
      });
    });

    describe('when linking to identifier', () => {

      beforeEach(() => {
        anchor.href = 'https://www.google.com/some-path?hello=world#test';
      });

      it('should find element by id', () => {
        handler.handle_(event);
        expect(event.defaultPrevented).to.be.true;
        expect(replaceStateForTargetStub).to.be.calledOnce;
        expect(replaceStateForTargetStub).to.be.calledWith('#test');
        expect(scrollIntoViewStub).to.not.be.called;
        return replaceStateForTargetPromise.then(() => {
          expect(scrollIntoViewStub).to.be.called;
          expect(scrollIntoViewStub).to.be.calledWith(elementWithId);
        });
      });

      it('should always call preventDefault', () => {
        elementWithId.id = 'something-else';
        handler.handle_(event);
        expect(event.defaultPrevented).to.be.true;
        expect(replaceStateForTargetStub).to.be.calledOnce;
        expect(replaceStateForTargetStub).to.be.calledWith('#test');
        return replaceStateForTargetPromise.then(() => {
          expect(scrollIntoViewStub).to.not.be.called;
        });
      });

      it('should call querySelector on document if element with id is not ' +
         'found', () => {
        anchor.href = 'https://www.google.com/some-path?hello=world#test2';
        handler.handle_(event);
        expect(replaceStateForTargetStub).to.be.calledOnce;
        expect(replaceStateForTargetStub).to.be.calledWith('#test2');
        expect(scrollIntoViewStub).to.not.be.called;
        return replaceStateForTargetPromise.then(() => {
          expect(scrollIntoViewStub).to.be.called;
          expect(scrollIntoViewStub).to.be.calledWith(anchorWithName);
        });
      });

      it('should call scrollIntoView twice if element with id is found', () => {
        handler.handle_(event);
        expect(replaceStateForTargetStub).to.be.calledOnce;
        expect(replaceStateForTargetStub).to.be.calledWith('#test');
        return replaceStateForTargetPromise.then(() => {
          expect(scrollIntoViewStub).to.have.callCount(1);
          return new Promise(resolve => {
            setTimeout(resolve, 2);
          });
        }).then(() => {
          expect(scrollIntoViewStub).to.have.callCount(2);
        });
      });

      it('should use escaped css selectors with spaces', () => {
        anchor.href =
            'https://www.google.com/some-path?hello=world#test%20hello';
        anchorWithName.setAttribute('name', 'test%20hello');
        handler.handle_(event);
        expect(replaceStateForTargetStub).to.be.calledWith('#test%20hello');
        return replaceStateForTargetPromise.then(() => {
          expect(scrollIntoViewStub).to.be.calledWith(anchorWithName);
        });
      });

      it('should use escaped css selectors with quotes', () => {
        anchor.href =
            'https://www.google.com/some-path?hello=world#test"hello';
        anchorWithName.setAttribute('name', 'test"hello');
        handler.handle_(event);
        expect(replaceStateForTargetStub).to.be.calledWith('#test"hello');
        return replaceStateForTargetPromise.then(() => {
          expect(scrollIntoViewStub).to.be.calledWith(anchorWithName);
        });
      });

      it('should push and pop history state with pre-existing hash', () => {
        win.location.href =
            'https://www.google.com/some-path?hello=world#first';
        handler.isIosSafari_ = true;
        handler.isIframed_ = false;
        handler.handle_(event);
        expect(replaceStateForTargetStub).to.be.calledOnce;
        expect(replaceStateForTargetStub).to.be.calledWith('#test');
      });

      it('should only scroll same hash, no history changes', () => {
        win.location.href =
            'https://www.google.com/some-path?hello=world#test';
        handler.handle_(event);
        expect(replaceStateForTargetStub).to.not.be.called;
        expect(scrollIntoViewStub).to.be.calledOnce;
        expect(scrollIntoViewStub).to.be.calledWith(elementWithId);
      });
    });
  });

  describes.realWin('fie embed', {
    amp: {
      ampdoc: 'fie',
    },
  }, env => {
    let win, doc;
    let parentWin;
    let ampdoc;
    let embed;
    let handler;
    let winOpenStub;
    let scrollIntoViewStub;
    let replaceStateForTargetStub;
    let replaceStateForTargetPromise;
    let anchor;
    let elementWithId;
    let anchorWithName;

    beforeEach(() => {
      win = env.win;
      doc = win.document;
      ampdoc = env.ampdoc;
      parentWin = env.parentWin;
      embed = env.embed;

      handler = win.services.clickhandler.obj;
      winOpenStub = sandbox.stub(win, 'open', () => {
        return {};
      });
      const viewport = parentWin.services.viewport.obj;
      scrollIntoViewStub = sandbox.stub(viewport, 'scrollIntoView');
      const history = parentWin.services.history.obj;
      replaceStateForTargetPromise = Promise.resolve();
      replaceStateForTargetStub = sandbox.stub(history,
          'replaceStateForTarget', () => replaceStateForTargetPromise);

      anchor = doc.createElement('a');
      anchor.href = 'http://ads.localhost:8000/example';
      doc.body.appendChild(anchor);
      event.target = anchor;

      elementWithId = doc.createElement('div');
      elementWithId.id = 'test';
      doc.body.appendChild(elementWithId);

      anchorWithName = doc.createElement('a');
      anchorWithName.setAttribute('name', 'test2');
      doc.body.appendChild(anchorWithName);
    });

    it('should adopt correctly to embed', () => {
      expect(handler.ampdoc).to.equal(ampdoc);
      expect(handler.rootNode_).to.equal(embed.win.document);
      expect(handler.isEmbed_).to.be.true;
    });

    describe('when linking to a different origin or path', () => {
      it('should update target to _blank', () => {
        anchor.href = 'https://www.google.com/some-other-path';
        handler.handle_(event);
        expect(event.defaultPrevented).to.be.false;
        expect(winOpenStub).to.not.be.called;
        expect(scrollIntoViewStub).to.not.be.called;
        expect(anchor.getAttribute('target')).to.equal('_blank');
      });

      it('should keep the target when specified', () => {
        anchor.href = 'https://www.google.com/some-other-path';
        anchor.setAttribute('target', '_top');
        handler.handle_(event);
        expect(event.defaultPrevented).to.be.false;
        expect(winOpenStub).to.not.be.called;
        expect(scrollIntoViewStub).to.not.be.called;
        expect(anchor.getAttribute('target')).to.equal('_top');
      });

      it('should reset the target when illegal specified', () => {
        anchor.href = 'https://www.google.com/some-other-path';
        anchor.setAttribute('target', '_self');
        handler.handle_(event);
        expect(event.defaultPrevented).to.be.false;
        expect(winOpenStub).to.not.be.called;
        expect(scrollIntoViewStub).to.not.be.called;
        expect(anchor.getAttribute('target')).to.equal('_blank');
      });
    });

    describe('when linking to identifier', () => {

      beforeEach(() => {
        anchor.href = 'http://ads.localhost:8000/example#test';
      });

      it('should NOT do anything, but cancel the event', () => {
        handler.handle_(event);
        expect(event.defaultPrevented).to.be.true;
        expect(replaceStateForTargetStub).to.not.be.called;
        expect(scrollIntoViewStub).to.not.be.called;
      });
    });
  });
});