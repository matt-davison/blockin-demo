import { FC, useState } from 'react'
import { AlgoIcon, BitIcon, CloseIcon, CopyIcon, EthIcon, KeyIcon } from './icons'
import Image from 'next/image'

const headerTitle = "BLOCKIN DEMO"

const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
}

const CryptoAddress = ({address, shortAddress, source, name}: {address:string, shortAddress: string, source: string, name: string}) => {
    return (
        <>
            <div className='my-5 flex w-full justify-evenly items-center'>
                <div className='w-7 sm:w-10 h-7 sm:h-10'>
                    <Image src={source} alt={name} width={500} height={500} layout='responsive' />
                </div>
                <p className='cursor-default w-7 sm:w-10 ml-3 sm:ml-5 mr-5 sm:mr-10 text-sm sm:text-base font-semibold'>{name}</p>
                <button onClick={() => copyText(address)} className=' rounded-lg shadow-md bg-gray-200 border py-1 w-24 sm:w-32 space-x-1 sm:space-x-3 px-2 sm:px-3 flex justify-evenly items-center text-black'>                            
                    <CopyIcon />
                    <p className=' text-xs sm:text-base flex-grow text-left font-extralight'>{shortAddress}</p>
                </button>
            </div>
        </>
    )
}

const Header = () => {
    const [donatePopup, toggleDonatePopup] = useState(false)

  return (
      <>
        <section className={`${donatePopup ? 'visible': 'hidden'} bg-gradient-to-b from-slate-200 to-slate-600 absolute l-0 r-0 w-full h-full p-10 flex flex-col justify-evenly items-center space-y-10 text-black`}>
            <div className='flex w-full justify-end'>
                <button onClick={() => toggleDonatePopup(false)} className='w-5 h-5'>
                    <CloseIcon />
                </button>
            </div>
            <h1 className='text-xl font-bold underline'>DONATE</h1>
            <p className=' text-sm md:text-base italic text-center'>We accept crypto donations to the following addresses:</p>
            <ul>
                <li><CryptoAddress name='BTC' source='/images/btc.png' address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" shortAddress="bc1...wlh" /></li>
                <li><CryptoAddress name='ETH' source='/images/eth.png' address="0x71C7656EC7ab88b098defB751B7401B5f6d8976F" shortAddress="0x71C...76F" /></li>
                <li><CryptoAddress name='ALGO' source='/images/algo.png' address="VCMJKWOY5P5P7SKMZFFOCEROPJCZOTIJMNIYNUCKH7LRO45JMJP6UYBIJA" shortAddress="0x71C...76F" /></li>
            </ul>
            <div className='flex-grow' />
        </section>
        <header className=' bg-gradient-to-b from-gray-700 to-gray-900 px-3 md:pl-5 md:pr-10 py-3 flex items-center justify-start space-x-5'>
            <div className='bg-gradient-to-b from-slate-100 to-slate-500 cursor-default text-black rounded-2xl border py-3 px-4 border-black shadow-md bg-slate-300 flex items-center justify-start space-x-3'>
                <KeyIcon />
                <h1 className='text-md font-semibold'>{headerTitle}</h1>
            </div>
            <div className='flex-grow' />
            <button onClick={() => toggleDonatePopup(true)} className='text-sm font-semibold bg-gradient-to-b from-yellow-300 to-yellow-600 p-2 shadow-md rounded-xl'>
                DONATE
            </button>
        </header>
    </>
  )
}

export default Header