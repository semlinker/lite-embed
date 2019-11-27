export interface Rule {
  regex: RegExp
  embedUrl: string
  html: string
  height: number
  width?: number
  preconnects: string[]
  id?: (ids: string[]) => string
}

export interface Rules {
  [key: string]: Rule
}

export const RULES: Rules = {
  qq: {
    regex: /https?:\/\/v\.qq\.com\/x\/(?:page|cover)\/(?:[^\/]+\/)?([\w]+)\.html/,
    embedUrl: 'https://v.qq.com/txp/iframe/player.html?vid=<%= remote_id %>',
    html: `<iframe scrolling='no' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%;' height="{{HEIGHT}}" src="{{SRC}}"></iframe>`,
    height: 300,
    preconnects: ['https://v.qq.com', 'https://vm.gtimg.cn', 'https://btrace.video.qq.com']
  },
  youku: {
    regex: /https?:\/\/v\.youku\.com\/v_show\/id_([^.]+).html?.+/,
    embedUrl: 'http://player.youku.com/embed/<%= remote_id %>',
    html: `<iframe scrolling='no' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%;' height="{{HEIGHT}}" src="{{SRC}}"></iframe>`,
    height: 498,
    preconnects: ['http://player.youku.com', 'https://api.youku.com', 'http://g.alicdn.com']
  },
  bilibili: {
    regex: /https?:\/\/www\.bilibili\.com\/video\/av([^?]+)?.+/,
    embedUrl: 'https://player.bilibili.com/player.html?aid=<%= remote_id %>&page=1',
    html: `<iframe scrolling='no' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%;' height="{{HEIGHT}}" src="{{SRC}}"></iframe>`,
    height: 498,
    preconnects: ['https://player.bilibili.com', 'https://api.bilibili.com', 'https://s1.hdslb.com']
  },
  vimeo: {
    regex: /(?:http[s]?:\/\/)?(?:www.)?vimeo\.co(?:.+\/([^\/]\d+)(?:#t=[\d]+)?s?$)/,
    embedUrl: 'https://player.vimeo.com/video/<%= remote_id %>?title=0&byline=0',
    html: `<iframe style="width:100%;" height="{{HEIGHT}}" src="{{SRC}}" frameborder="0"></iframe>`,
    height: 320,
    preconnects: ['https://player.vimeo.com', 'https://i.vimeocdn.com', 'https://f.vimeocdn.com']
  },
  youtube: {
    regex: /(?:https?:\/\/)?(?:www\.)?(?:(?:youtu\.be\/)|(?:youtube\.com)\/(?:v\/|u\/\w\/|embed\/|watch))(?:(?:\?v=)?([^#&?=]*))?((?:[?&]\w*=\w*)*)/,
    embedUrl: 'https://www.youtube.com/embed/<%= remote_id %>',
    html: `<iframe style="width:100%;" height="{{HEIGHT}}" src="{{SRC}}" frameborder="0" allowfullscreen></iframe>`,
    height: 320,
    id: ([id, params]) => {
      if (!params && id) {
        return id
      }

      const paramsMap: { [index: string]: string } = {
        start: 'start',
        end: 'end',
        t: 'start',
        time_continue: 'start',
        list: 'list'
      }

      return (
        id +
        '?' +
        params
          .slice(1)
          .split('&')
          .map(param => {
            const [name, value] = param.split('=')

            if (!id && name === 'v') {
              id = value
              return
            }

            if (!(name in paramsMap)) return

            return `${paramsMap[name]}=${value}`
          })
          .filter(param => !!param)
          .join('&')
      )
    },
    preconnects: [
      'https://www.youtube.com',
      'https://www.google.com',
      'https://googleads.g.doubleclick.net',
      'https://static.doubleclick.net'
    ]
  },
  codepen: {
    regex: /https?:\/\/codepen\.io\/([^\/\?\&]*)\/pen\/([^\/\?\&]*)/,
    embedUrl:
      'https://codepen.io/<%= remote_id %>?height=300&theme-id=0&default-tab=css,result&embed-version=2',
    html: `<iframe scrolling='no' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%;' height="{{HEIGHT}}" src="{{SRC}}"></iframe>`,
    height: 300,
    id: ids => ids.join('/embed/'),
    preconnects: ['https://codepen.io', 'https://static.codepen.io', 'https://fonts.googleapis.com']
  }
}

export interface EmbedOption {
  site: string
  height: number
  source: string
  embed: string
  html: string
  preconnects: string[]
}

const defaultIdsHandler = (ids: string[]) => ids.shift()!

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
