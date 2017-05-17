(function() {
const template = document.createElement('template');
template.innerHTML = `
<style>
:host {
  display: block;
  position: relative;
  overflow: hidden;
  contain: content;
  line-height: 0;
}

#container {
  width: 100%;
}

#container ::slotted(*) {
  position: absolute;
  transform-origin: 0 0;
}
</style>
<div id="container"><slot id="content"></slot></div>`;
ShadyCSS.prepareTemplate(template, 'impetus-scroller');

class DryStoneLayoutElement extends HTMLElement {
  static get observedAttributes() {
    return ['disabled', 'height', 'spacing', 'friction', 'selected'];
  }

  constructor() {
    super();

    let shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.appendChild(document.importNode(template.content, true));

    this._container = this.shadowRoot.querySelector('#container');
    this._slot = this.shadowRoot.querySelector('#content');

    this.loading = true;
    this.friction = 0.96;
    this.spacing = 1;
    this.selected = 0;
    this.height = 90;
    this.debounce = 30;
  }

  connectedCallback() {
    this.setAttribute('loading', '');
    ShadyCSS.styleElement(this);

    this._onNodesChanged = this._childNodesChanged.bind(this);
    this._onNodesChanged();

    this._slotChangeListener = this._slot.addEventListener('slotchange', this._onNodesChanged, false);
    this._domChangeListener = this._slot.addEventListener('dom-change', this._onNodesChanged, false);

    this._onResize = this._debounce(this._render.bind(this), this.debounce);
    this._resizeListener = window.addEventListener('resize', this._onResize, false);
  }

  disconnectedCallback() {
    this._slot.removeEventListener('slotchange', this._slotChangeListener);
    this._slot.removeEventListener('dom-change', this._domChangeListener);

    window.removeEventListener('resize', this._resizeListener);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // console.log(name, oldValue, newValue);
    if (oldValue === newValue) return;
    switch (name) {
      case 'spacing':
        this.spacing = parseInt(newValue);
        break;
      case 'selected':
        this.selected = parseInt(newValue);
        break;
      case 'friction':
        this.friction = parseFloat(newValue);
        break;
    }
    this._render();
  }

  _debounce(fn, delay) {
    var timer = null;
    return () => {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(context, args), delay);
    };
  }

  _childNodesChanged() {
    var nodes = this._slot.assignedNodes().filter(n => n.nodeType == Node.ELEMENT_NODE && n.tagName !== "TEMPLATE" && n.tagName !== "DOM-REPEAT");
    this._dimensions = nodes
    .map(n => {
      let w = n.width || n.clientWidth;
      let h = n.height || n.clientHeight;
      return { node: n, width: w, height: h, aspect: w / h };
    })
    this._render();
  }

  _render() {
    requestAnimationFrame(() => {
      // console.log(this.width || this.clientWidth, this.height || this.clientHeight, this._dimensions);
      this._width = this.clientWidth;
      this._height = this.clientHeight;

      var left = 0;
      this._dimensions.forEach(d => {
        var width = Math.round(this._height * d.aspect);
        var scaleX = width / d.width;
        var scaleY = this._height / d.height;
        var transform = 'translate(' + left + 'px,0px) scale(' + scaleX.toFixed(6) + ',' + scaleY.toFixed(6) + ')';
        d.node.style.transform = transform;

        left += width + this.spacing;
      })

      this._totalWidth = left - this.spacing;
      this._container.style.width = this._totalWidth + 'px';

      if (this.loading && this._dimensions.length > 0) {
        // set initial position
        if (this.selected) {
          var x = this._positionForIndex();
          this._positionChanged(x, 0);
        }

        var min = -(this._totalWidth - this._width);
        if (min > 0) {
          min = 0;
        }
        if (this.x < min) {
          this.x = min;
        }

        this._impetus = new Impetus({
          source: this,
          boundX: [min, 0],
          boundY: [0, this._height],
          initialValues: [x, 0],
          friction: this.friction,
          update: this._positionChanged.bind(this)
        });

        this.loading = false;
        requestAnimationFrame(() => {
          this.removeAttribute('loading');
          this.setAttribute('loaded', '');
        });
      }
    });
  }

  _positionForIndex() {
    if (this.selected >= this._layout.length) {
      this.selected = this._layout.length - 1;
    }
    var item = this._layout[this.selected];
    var x = item.left + item.width / 2 - this._width / 2;
    if (x < 0) x = 0;
    if (x > (this._totalWidth - this._width)) x = this._totalWidth - this._width;
    return -x;
  }

  _positionChanged(x, y) {
    // console.log(x, this._impetus);
    if (this.x != x) {
      this.x = x;
      this._container.style.transform = 'translateX(' + x + 'px)';
    }
  }
}

window.customElements.define('impetus-scroller', DryStoneLayoutElement);
}());
