import Head from 'next/head'
import Layout, { siteTitle } from '../components/layout'

export default function Home() {
  return (
    <Layout>
      <Head>
        <title>{siteTitle}</title>
      </Head>
      <section className='text-center p-10'>
        <p>A simple frontend implementation of the Blockin library</p>
      </section>
    </Layout>
  )
}
