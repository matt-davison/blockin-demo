import Head from 'next/head'
import Image from 'next/image'

const name = 'Blockin Foundation'
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
      <header>
          <Image
            priority
            src="/images/profile.jpg"
            height={144}
            width={144}
            alt={name}
          />
          <h1>{name}</h1>
      </header>
      <main>{children}</main>
    </div>
  )
}