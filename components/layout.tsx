import Head from 'next/head'
import { useState } from 'react'
import BlockinHeader from './BlockinHeader';
import DonateCard from './DonateCard';

export const siteTitle = 'Blockin Demo'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const [donatePopup, toggleDonatePopup] = useState(false)
  
  return (
    <div>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Basic frontend implementation of Blockin library"
        />
      </Head>
      { donatePopup ?
        <DonateCard togglePopup={toggleDonatePopup} /> :
        <>
          <BlockinHeader togglePopup={toggleDonatePopup} />
          <main>{children}</main>
        </>
      }
    </div>
  )
}