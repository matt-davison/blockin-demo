import Head from 'next/head'
import BlockinHeader from './BlockinHeader';

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
        <BlockinHeader />
        <main>{children}</main>
    </div>
  )
}