import Matcher, { EmbedOption } from './services'

import './lite-embed.css'

class LiteEmbed extends HTMLElement {
  static prefetchUrlSet = new Set()
  private src: string
  private height: number
  private posterUrl: string
  private embedOption: EmbedOption | null

  constructor() {
    super()
    this.src = this.getAttribute('src') || ''
    this.height = Number(this.getAttribute('height'))
    this.posterUrl =
      this.getAttribute('poster-url') ||
      'https://i.ytimg.com/vi/ogfYd705cRs/hqdefault.jpg'
    this.embedOption = Matcher.matches(this.src)
    LiteEmbed.addPrefetch('preload', this.posterUrl, 'image')
  }

  connectedCallback() {
    if (this.embedOption != null) {
      this.style.backgroundImage = `url("${this.posterUrl}")`
      this.style.height =
        this.getAttribute('height') || this.embedOption.height.toString()

      const playBtn = document.createElement('div')
      playBtn.classList.add('lte-playbtn')
      this.appendChild(playBtn)

      this.addEventListener(
        'pointerover',
        () => LiteEmbed.warmConnections(this.embedOption!.preconnects),
        { once: true }
      )
      this.addEventListener('click', e => this.addIframe())
    }
  }

  static addPrefetch(kind: string, url: string, as?: string) {
    if (LiteEmbed.prefetchUrlSet.has(url)) return
    const linkElem = document.createElement('link')
    linkElem.rel = kind
    linkElem.href = url
    if (as) {
      ;(linkElem as any).as = as
    }
    linkElem.crossOrigin = 'true'
    document.head.appendChild(linkElem)
    LiteEmbed.prefetchUrlSet.add(url)
  }

  static warmConnections(preconnects: string[]) {
    preconnects.forEach(preconnect =>
      LiteEmbed.addPrefetch('preconnect', preconnect)
    )
  }

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
}

customElements.define('lite-embed', LiteEmbed)
