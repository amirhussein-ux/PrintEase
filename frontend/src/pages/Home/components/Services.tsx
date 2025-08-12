import { useState } from 'react'
import { BsQrCode } from 'react-icons/bs'
import { MdOutlineManageSearch } from 'react-icons/md'
import { GrDocumentCloud } from 'react-icons/gr'
import { FiShoppingCart } from 'react-icons/fi'

const services = [
  {
    name: 'QR Code Pickup',
    description:
      'Streamline business transactions with our QR code system. Customers can easily track and pick up their orders by scanning QR codes, ensuring a smooth and efficient pickup process.',
    icon: <BsQrCode size={24} />,
  },
  {
    name: 'Queue management',
    description:
      'Optimize your workflow with our intelligent queue management system. Prioritize jobs, track progress, and ensure timely delivery with our advanced scheduling algorithms.',
    icon: <MdOutlineManageSearch size={24} />,
  },
  {
    name: 'Document Cloud Integration',
    description:
      'Seamlessly integrate with popular cloud services like Google Drive, Dropbox, and OneDrive. Access, print, and manage documents directly from your preferred cloud storage platform.',
    icon: <GrDocumentCloud size={24} />,
  },
  {
    name: 'Products',
    description:
      'Explore our wide range of high-quality printing products and services tailored to your needs.',
    icon: <FiShoppingCart size={24} />,
  },
]

const products = [
  { 
    name: 'Stickers', 
    description: 'High-quality custom stickers for personal or business use.',
    image: 'https://media.istockphoto.com/id/1315145896/vector/yummy-sticker-set.jpg?s=612x612&w=0&k=20&c=WVjHbIptj1dO3g0s5qBO-iovQghsl6PhmV2ijjbM_pk=' 
  },
  { 
    name: 'T-Shirt', 
    description: 'Customized t-shirts printed with your design or logo.',
    image: 'https://thumbs.dreamstime.com/b/white-tshirt-words-your-design-here-hanging-hanger-simple-white-tshirt-featuring-words-your-design-341275099.jpg'
  },
  { 
    name: 'Motorplate', 
    description: 'Durable custom motorplates for motorcycles.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Motor_plate_NCR.png'
  },
  { 
    name: 'Customized Notepads', 
    description: 'Personalized notepads perfect for branding or gifting.',
    image: 'https://media.istockphoto.com/id/1449128535/vector/a-notebook-with-a-horizontal-spring-coil-lies-on-top-of-another-notebook-notepad-with-a.jpg?s=612x612&w=0&k=20&c=Dwi3ueiteZZv7F7qdh9fZirZId8Kq-6HHyvtkRCv7GU='
  },
  { 
    name: 'PVC ID', 
    description: 'Professional PVC ID cards for businesses, schools, and organizations.',
    image: 'https://media.istockphoto.com/id/612650934/vector/id-card-isolated-on-white-background-business-identification-icon.jpg?s=612x612&w=0&k=20&c=byimQb2_LJydS803qrpYKk-80dIC4HEp-BidObosij0='
  },
  { 
    name: 'Customized Ref Magnet', 
    description: 'Fridge magnets with your personalized design.',
    image: 'https://media.istockphoto.com/id/866168454/photo/many-different-souvenir-magnets-on-the-fridge.jpg?s=612x612&w=0&k=20&c=uyKo2MNZh4QSNh26OFLCdWEkNjcjt-9G8UbnaPD1R8I='
  },
  { 
    name: 'Calling, Loyalty, and Membership Cards', 
    description: 'Custom cards to suit your business needs.',
    image: 'https://worksheets.clipart-library.com/images2/printing-business-cards-price/printing-business-cards-price-32.jpg'
  },
  { 
    name: 'Tarpaulin', 
    description: 'High-quality printed tarpaulins for events and promotions.',
    image: 'https://img.lazcdn.com/g/p/aee313578231955568df0a77d39e3430.png_720x720q80.png'
  },
  { 
    name: 'Customized Mousepad', 
    description: 'Personalized mousepads for personal or office use.',
    image: 'https://printify.com/wp-content/uploads/2023/06/Why-Create-and-Sell-Custom-Mouse-Pads-e1686214558706.jpg'
  },
  { 
    name: 'Mugs', 
    description: 'Custom printed mugs perfect for gifts or branding.',
    image: 'https://www.yourprint.in/new-admin-ajax.php?action=resize_outer_image&cfcache=all&url=https%3A%2F%2Fwww.yourprint.in%2Fwp-content%2Fuploads%2F2017%2F05%2Fwhite_mug.png&resizeTo=450&format=webp'
  },
  { 
    name: 'LTFRB Sticker', 
    description: 'Official LTFRB-compliant stickers for vehicles.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/LTFRB_Seal.svg'
  },
]

export default function Services() {
  const [showProducts, setShowProducts] = useState(false)
  const [fade, setFade] = useState(true)

  const features = showProducts ? products : services

  const toggleView = () => {
    setFade(false)
    setTimeout(() => {
      setShowProducts(!showProducts)
      setFade(true)
    }, 200)
  }

  return (
    <div className="bg-white py-24 sm:py-32 transition-all duration-500">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <p
            className={`mt-2 text-4xl font-semibold tracking-tight text-pretty text-blue-900 sm:text-5xl lg:text-balance transition-all duration-500 ${
              fade ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
          >
            {showProducts ? 'Products' : 'Services'}
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <div
            className={`grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16 transition-all duration-500 ${
              fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {features.map((feature) => (
              <div
                key={feature.name}
                className="transform transition-transform duration-300 hover:scale-[1.02] h-full"
              >
                <div className="p-6 rounded-lg bg-blue-900 text-white h-full">
                  <div className="flex items-center gap-4 mb-3">
                    {showProducts ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden">
                        <img 
                          src={feature.image} 
                          alt={feature.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="text-white">
                        {feature.icon}
                      </div>
                    )}
                    <dt className="text-lg font-semibold">
                      {feature.name}
                    </dt>
                  </div>
                  <dd className="ml-12 text-white/90">{feature.description}</dd>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <button
              onClick={toggleView}
              className="px-6 py-3 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 transition-colors duration-300"
            >
              {showProducts ? 'Show Services' : 'Show Products'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}