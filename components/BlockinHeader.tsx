import { KeyIcon } from "./Icons"

const headerTitle = "BLOCKIN DEMO"

const BlockinHeader = ({togglePopup}: {togglePopup: any}) => {
    return (
        <>
            <header className=' bg-gradient-to-b from-gray-700 to-gray-900 px-3 md:pl-5 md:pr-10 py-3 flex items-center justify-start space-x-5'>
              <div className='bg-gradient-to-b from-slate-100 to-slate-500 cursor-default text-black rounded-2xl border py-3 px-4 border-black shadow-md bg-slate-300 flex items-center justify-start space-x-3'>
                  <KeyIcon />
                  <h1 className='text-sm font-semibold'>{headerTitle}</h1>
              </div>
              <div className='flex-grow' />
              <button onClick={() => togglePopup(true)} className='text-sm font-semibold bg-gradient-to-b from-yellow-300 to-yellow-600 p-2 shadow-md rounded-xl'>
                  DONATE
              </button>
            </header>
        </>
    )
}

export default BlockinHeader