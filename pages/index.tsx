import Wallet from "components/Wallet/Wallet";
import Head from "next/head";
import Layout from "../components/layout";

const siteTitle = 'BLOCKIN DEMO'

export default function Home() { 
  return (
    <Layout>
      <Head>
        <title>{siteTitle}</title>
      </Head>
      <section className='text-center p-10'>
        <Wallet />
      </section>
    </Layout>
  )
}
