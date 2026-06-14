export function resolveShellRoute(pathname, labels) {
  const currentPathname = pathname || ''
  const isGameDetailRoute =
    /^\/game\/[^/]+$/.test(currentPathname) && currentPathname !== '/game/create'
  const isGameEditRoute = /^\/game\/[^/]+\/edit$/.test(currentPathname)

  if (isGameEditRoute) {
    const gameId = currentPathname.split('/')[2]
    return {
      title: labels.gameEditor('ui.topBarEdit'),
      backHref: `/game/${gameId}`,
    }
  }

  if (isGameDetailRoute) {
    return {
      title: labels.gamePlayPage('title'),
      backHref: '/miei-giochi',
    }
  }

  const routes = {
    '/admin': {
      title: labels.admin('title'),
      backHref: '/dashboard',
    },
    '/admin/corsi': {
      title: labels.admin('coursesTitle'),
      backHref: '/admin',
    },
    '/admin/produttori': {
      title: labels.admin('producersTitle'),
      backHref: '/admin',
    },
    '/admin/vini': {
      title: labels.admin('catalog.winesTitle'),
      backHref: '/admin',
    },
    '/auth': {
      title: labels.home('loginOrRegister'),
      backHref: '/',
      smartBack: true,
    },
    '/copyright': {
      title: labels.home('copyrightLabel'),
      backHref: '/',
      smartBack: true,
    },
    '/game/create': {
      title: labels.gameCreate('title'),
      backHref: '/miei-giochi',
    },
    '/game/create/automatic': {
      title: labels.gameCreate('title'),
      backHref: '/game/create',
    },
    '/game/create/quick': {
      title: labels.gameEditor('ui.topBarCreate'),
      backHref: '/game/create',
    },
    '/game/create/custom': {
      title: labels.gameEditor('ui.topBarCreate'),
      backHref: '/game/create',
    },
    '/corso-vino': {
      title: labels.course('title'),
      backHref: '/dashboard',
      smartBack: true,
    },
    '/dashboard': {
      showTopBar: false,
    },
    '/dashboard/storico': {
      title: labels.dashboard('storico.title'),
      backHref: '/dashboard',
    },
    '/changelog': {
      title: labels.profile('changelog'),
      backHref: '/',
      smartBack: true,
    },
    '/info': {
      title: labels.info('title'),
      backHref: '/',
      smartBack: true,
    },
    '/profilo': {
      title: labels.profile('title'),
      backHref: '/dashboard',
    },
    '/profilo/crediti': {
      title: labels.profile('credits'),
      backHref: '/profilo',
    },
    '/profilo/preferenze': {
      title: labels.profile('preferences'),
      backHref: '/profilo',
    },
    '/profilo/pubblico': {
      title: labels.profile('publicProfile'),
      backHref: '/profilo',
    },
    '/profilo/partite': {
      title: labels.profile('matchesTitle'),
      backHref: '/profilo',
    },
    '/miei-giochi': {
      title: labels.dashboard('myGames'),
      backHref: '/dashboard',
    },
  }

  return routes[currentPathname] || null
}
