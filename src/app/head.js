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
      <link rel="apple-touch-icon" href="/logo.svg" />
      <AppleSplashLinks />
    </>
  )
}
