import AboutUs from './components/About'
import Header from './components/Header'
import Hero from './components/Hero'
import Services from './components/Services'
import Testimonials from './components/Testimonials'
import HowItWorks from './components/HowItWorks'
import Feedback from './components/Feedback'
import Contact from './components/Contact'
import Footer from './components/Footer'

const Home = () => {
  return (
    <>
      <Header/>
      <Hero/>
      <HowItWorks/>
      <Services/>
      <AboutUs/>
      <Testimonials/>
      <Feedback/>
      <Contact/>
      <Footer/>
    </>
  )
}

export default Home