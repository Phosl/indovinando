// src/app/head.js
// Custom <head> for Next.js app directory, includes Apple splash screens
import React from 'react'
import AppleSplashLinks from '@/components/AppleSplashLinks'

export default function Head() {
  return (
    <>
      <title>Indovinando</title>
      <meta name="theme-color" content="#ffffff" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Indovinando" />
      {/* Favicon standard */}
      <link rel="icon" type="image/x-icon" href="/app_icon/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/app_icon/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/app_icon/favicon-16x16.png" />
      {/* Icona Apple (180x180 PNG) */}
      <link rel="apple-touch-icon" sizes="180x180" href="/app_icon/apple-touch-icon.png" />
      {/* Icone Android manifest */}
      <link rel="icon" type="image/png" sizes="192x192" href="/app_icon/android-chrome-192x192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/app_icon/android-chrome-512x512.png" />
      {/* Icona manifest (per Android) */}
      <link rel="manifest" href="/manifest.json" />
      <AppleSplashLinks />
    </>
  )
}
