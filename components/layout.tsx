import Head from 'next/head'
import Image from 'next/image'
import Header from './header'

export const siteTitle = 'Blockin Demo'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Basic frontend implementation of Blockin library"
        />
      </Head>
      <Header />
      <main>{children}</main>
    </div>
  )
}