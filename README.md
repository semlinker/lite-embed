## Lite-embed

### 简介

本项目的灵感来源于 paulirish 大佬的 [lite-youtube-embed](https://github.com/paulirish/lite-youtube-embed) 项目：

> Provide videos with a supercharged focus on visual performance. This custom element renders just like the real thing but approximately 224X faster.
>
> **提供具有视觉效果的视频。这个自定义元素的渲染方式与真实的效果一样，但是速度提高了约 224 倍。**

Lite-embed 是基于 customElements Web Components 标准开发的组件，支持以 iframe 方式快速地嵌入第三方站点，如 **Bilibili**、**Youku**、**QQ**、**Youtube**、**Vimeo** 和 **Codepen** 等。

通过扩展本项目 **services.ts** 服务类的匹配规则，开发者可以方便的支持其它支持 iframe 方式嵌入的站点，除此之外基于  **services.ts**  服务类，也可以让富文本编辑器支持自动解析剪贴板中的网址，自动嵌入所匹配的站点。

#### 快速上手

1、引入 `lite-embed` 脚本库

```html
<script src="../dist/lite-embed.umd.js"></script>
```

2、设置内嵌的第三方站点的链接地址

```html
<!-- Youku -->
<h2>v.youku.com</h2>
<lite-embed
    src="https://v.youku.com/v_show/id_XNDM4NDc2NTUzNg==.html?spm=a2ha1.12675304.m_7182_c_14738.d_1&s=edca0b0e0fff464ea306&scm=20140719.rcmd.7182.show_edca0b0e0fff464ea306"
    height="200">
</lite-embed>

<!-- QQ -->
<h2>v.qq.com</h2>
<lite-embed
    src="https://v.qq.com/x/cover/mzc0020095v1n4t/q0032kben9j.html"
    height="200">
</lite-embed>

<!--  Bilibili -->
<h2>www.bilibili.com</h2>
<lite-embed
    src="https://www.bilibili.com/video/av76507858?spm_id_from=333.851.b_7265706f7274466972737431.12"
    height="200">
</lite-embed>

<!--  Youtube -->
<h2>www.youtube.com</h2>
<lite-embed src="https://www.youtube.com/watch?v=c5GAS_PMXDs" height="200"></lite-embed>

<!--  Vimeo -->
<h2>vimeo.com</h2>
<lite-embed src="https://vimeo.com/265045525" height="200"> </lite-embed>

<!--  Codepen -->
<h2>codepen.io</h2>
<lite-embed src="https://codepen.io/aaroniker/pen/ZEEWoKj" height="200"> </lite-embed>
```

### Lite-embed 原理解析

Lite-embed 组件通常以下的手段来提升 iframe 内嵌站点的加载体验：

- 在悬停（或点击）视频封面或海报时，预热（可能）要使用的 TCP 连接。
- 在点击视频封面或海报时，才开始动态加载 iframe。

> 备注：在点击视频封面或海报时，才开始动态加载 iframe，也带来一定的问题，即需要二次点击才可以正常播放嵌入的视频。

#### 构造函数

```typescript
class LiteEmbed extends HTMLElement {
  static preconnected: boolean
  private src: string
  private height: number
  private posterUrl: string
  private embedOption: EmbedOption | null
  
  constructor() {
    super()
    this.src = this.getAttribute('src') || ''
    this.height = Number(this.getAttribute('height'))
    this.posterUrl =
      this.getAttribute('poster-url') || 'https://i.ytimg.com/vi/ogfYd705cRs/hqdefault.jpg'
    this.embedOption = Matcher.matches(this.src)
    LiteEmbed.addPrefetch('preload', this.posterUrl, 'image')
  }
}
```

#### 生命周期钩子

```typescript
connectedCallback() {
    if (this.embedOption != null) {
      // 设置背景图片
      this.style.backgroundImage = `url("${this.posterUrl}")`
      this.style.height = this.getAttribute('height') || this.embedOption.height.toString()

      // 创建播放按钮
      const playBtn = document.createElement('div')
      playBtn.classList.add('lte-playbtn')
      this.appendChild(playBtn)

      // 悬停（或点击）时，预热（可能）要使用的TCP连接。
  		// once: true 表示listener在添加之后最多只调用一次。如果是true， 
      // listener会在其被调用之后自动移除。
      this.addEventListener(
        'pointerover',
        () => LiteEmbed.warmConnections(this.embedOption!.preconnects),
        { once: true }
      )
      // 一旦用户点击，添加实际的iframe
      this.addEventListener('click', e => this.addIframe())
    }
}
```

自定义元素可以定义特殊生命周期钩子，以便在其存续的特定时间内运行代码。 这称为**自定义元素响应**。目前支持的生命周期钩子如下：

| 名称                                                 | 调用时机                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `constructor`                                        | 创建或升级元素的一个实例。用于初始化状态、设置事件侦听器或创建 Shadow DOM。参见规范，了解可在 `constructor` 中完成的操作的相关限制。 |
| `connectedCallback`                                  | 元素每次插入到 DOM 时都会调用。用于运行安装代码，例如获取资源或渲染。一般来说，您应将工作延迟至合适时机执行。 |
| `disconnectedCallback`                               | 元素每次从 DOM 中移除时都会调用。用于运行清理代码（例如移除事件侦听器等）。 |
| `attributeChangedCallback(attrName, oldVal, newVal)` | 属性添加、移除、更新或替换。解析器创建元素时，或者升级时，也会调用它来获取初始值。**Note:** 仅 `observedAttributes` 属性中列出的特性才会收到此回调。 |
| `adoptedCallback()`                                  | 自定义元素被移入新的 `document`（例如，有人调用了 `document.adoptNode(el)`）。 |

#### addPrefetch 方法

该方法用于动态添加 link 标签并设置相应的 rel 属性来实现预加载或预链接：

```javascript
static addPrefetch(kind: string, url: string, as?: string) {
    const linkElem = document.createElement('link')
    linkElem.rel = kind
    linkElem.href = url
    if (as) {
      (linkElem as any).as = as
    }
    linkElem.crossOrigin = 'true'
    document.head.appendChild(linkElem)
}
```

在实际开发中可以通过设置 link 标签 rel 属性来提升网页的渲染速度（有兼容性问题），常见的类型如下：

- prefetch：提示浏览器提前加载链接的资源，因为它可能会被用户请求。建议浏览器提前获取链接的资源，因为它很可能会被用户请求。 从 Firefox 44 开始，考虑了 `crossorigin` 属性的值，从而可以进行匿名预取。

- preconnect：向浏览器提供提示，建议浏览器提前打开与链接网站的连接，而不会泄露任何私人信息或下载任何内容，以便在跟随链接时可以更快地获取链接内容。

- preload：告诉浏览器下载资源，因为在当前导航期间稍后将需要该资源。

- prerender：建议浏览器事先获取链接的资源，并建议将预取的内容显示在屏幕外，以便在需要时可以将其快速呈现给用户。

- dns-prefetch：提示浏览器该资源需要在用户点击链接之前进行 DNS 查询和协议握手。

>  若需了解完整的链接类型，可以访问 [MDN - Link Type](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types)。

#### warmConnections

该方法用于预热链接：

```typescript
static warmConnections(preconnects: string[]) {
    if (LiteEmbed.preconnected) return
    preconnects.forEach(preconnect => LiteEmbed.addPrefetch('preconnect', preconnect))
    LiteEmbed.preconnected = true
}
```

#### addIframe

该方法用于动态添加 iframe 元素：

```typescript
addIframe() {
    if (this.embedOption != null) {
      const finalEmbedOption = {
        ...this.embedOption,
        ...{ height: this.height, src: this.embedOption.embed }
      }
      const iframeHTML = this.embedOption.html.replace(
        /\{\{(\w*)\}\}/g,
        (m: string, key: string) => {
          return (finalEmbedOption as any)[key.toLowerCase()]
        }
      )
      this.insertAdjacentHTML('beforeend', iframeHTML)
      this.classList.add('lyt-activated')
    }
}
```

#### services 服务类

该服务类中定义了所支持站点的匹配规则和 Matcher 匹配工具类：

**Rule 接口定义**

```typescript
export interface Rule {
  regex: RegExp // 内嵌站点正则表达式
  embedUrl: string // 内嵌站点的url地址
  html: string // 内嵌站点的iframe url模板
  height: number // 高度
  width?: number // 宽度
  preconnects: string[] // 预链接的地址
  id?: (ids: string[]) => string // 视频或资源id处理器
}
```

**Rules 规则定义**

```typescript
export const RULES: Rules = {
  codepen: {
    regex: /https?:\/\/codepen\.io\/([^\/\?\&]*)\/pen\/([^\/\?\&]*)/,
    embedUrl:
      'https://codepen.io/<%= remote_id %>?height=300&theme-id=0&default-tab=css,result&embed-version=2',
    html: `<iframe scrolling='no' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%;' height="{{HEIGHT}}" src="{{SRC}}"></iframe>`,
    height: 300,
    id: ids => ids.join('/embed/'),
    preconnects: ['']
  },
  bilibili: {
    regex: /https?:\/\/www\.bilibili\.com\/video\/av([^?]+)?.+/,
    embedUrl: 'https://player.bilibili.com/player.html?aid=<%= remote_id %>&page=1',
    html: `<iframe scrolling='no' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%;' height="{{HEIGHT}}" src="{{SRC}}"></iframe>`,
    height: 498,
    preconnects: ['https://player.bilibili.com', 'https://api.bilibili.com', 'https://s1.hdslb.com']
  },
}
```

**Matcher 类**

```typescript
export default class Matcher {
  static matches(url: string): EmbedOption | null {
    if (!url) return null
    let result = null
    for (let site of Object.keys(RULES)) {
      if ((result = Matcher.match(site, url)) != null) {
        return result
      }
    }
    return result
  }

  static match(site: string, url: string): EmbedOption | null {
    const { regex, embedUrl, html, height, id = defaultIdsHandler, preconnects } = RULES[site]
    const matches: RegExpExecArray | null = regex.exec(url)
    if (matches != null) {
      const result = matches.slice(1)
      const embed = embedUrl.replace(/<\%\= remote\_id \%\>/g, id(result))
      return {
        site,
        source: url,
        height,
        embed,
        preconnects,
        html
      }
    }
    return null
  }
}
```