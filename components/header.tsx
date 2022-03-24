import { FC, useState } from 'react'
import { AlgoIcon, BitIcon, CloseIcon, CopyIcon, EthIcon, KeyIcon } from './icons'
import Image from 'next/image'

const headerTitle = "BLOCKIN DEMO"

const CryptoAddress = ({address, source, name}: {address:string, source: string, name: string}) => {
    return (
        <>
            <div className='my-5 flex w-full justify-evenly items-center'>
                <Image src={source} alt={name} width={50} height={50} />
                <p className='w-10 ml-5 mr-10 font-semibold'>{name}</p>
                <div className=' shadow-xl bg-gray-200 border p-2 w-36 flex space-x-1 justify-center items-center'>                            
                    <CopyIcon />
                    <p className='w-1/2 font-extralight'>{address}</p>
                </div>
            </div>
        </>
    )
}

const Header = () => {
    const [donatePopup, toggleDonatePopup] = useState(false)

  return (
      <>
        <section className={`${donatePopup ? 'visible': 'hidden'} bg-gradient-to-b from-slate-200 to-slate-400 absolute l-0 r-0 w-screen h-screen p-10 flex flex-col justify-evenly items-center space-y-10`}>
            <div className='flex w-full justify-end'>
                <button onClick={() => toggleDonatePopup(false)} className='text-red-500 shadow-lg border-2 bg-black border-black rounded-full'>
                    <CloseIcon />
                </button>
            </div>
            <h1 className='text-xl font-bold underline'>DONATE</h1>
            <p className='text-md italic'>We accept crypto donations to the following addresses:</p>
            <ul>
                <li><CryptoAddress name='BTC' source='/images/btc.png' address="0x71C...76F" /></li>
                <li><CryptoAddress name='ETH' source='/images/eth.png' address="0x71C...76F" /></li>
                <li><CryptoAddress name='ALGO' source='/images/algo.png' address="VCMD...PIJA" /></li>
            </ul>
            <div className='flex-grow' />
        </section>
        <header className=' bg-gradient-to-b from-blue-400 to-blue-500 px-3 md:pl-5 md:pr-10 py-3 flex items-center justify-start space-x-5'>
            <div className='bg-gradient-to-b from-slate-100 to-slate-400 cursor-default text-black rounded-2xl border-2 py-3 px-4 border-black shadow-lg bg-slate-300 flex items-center justify-start space-x-3'>
                <KeyIcon />
                <h1 className='text-xl font-bold'>{headerTitle}</h1>
            </div>
            <div className='flex-grow' />
            <button onClick={() => toggleDonatePopup(true)} className='text-sm font-semibold bg-gradient-to-b from-yellow-300 to-yellow-600 p-2 shadow-lg border border-black rounded-xl'>DONATE</button>
        </header>
    </>
  )
}

export default Header