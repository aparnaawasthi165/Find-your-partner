import Nav from '../components/Nav'
import AuthModal from "../components/AuthModal"
import {useState} from 'react'
import {useCookies} from "react-cookie"
import { useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const Home = () => {
    const [showModal, setShowModal] = useState(false)
    const [isSignUp, setIsSignUp] = useState(true)
    const [cookies, setCookie, removeCookie] = useCookies(['user'])
    const authToken = cookies.AuthToken
   let navigate=useNavigate();

    const getUser = async () => {
  try {

    const response = await axios.get("http://localhost:8000/loginsuccess");
    const { token, userId } = response.data;
    
    setCookie('AuthToken', token);
    setCookie('UserId', userId);
    const success = response.status === 201;
    if (success && isSignUp) {
      navigate('/onboarding');
    }
    if (success && !isSignUp) {
      navigate('/dashboard');
    }
  } catch (error) {
    console.log(error);
  }
};

    useEffect(()=>{
      getUser();
    },[])

    const handleClick = () => {
        if (authToken) {
            removeCookie('UserId', cookies.UserId)
            removeCookie('AuthToken', cookies.AuthToken)
            window.location.reload()
            return
        }
        setShowModal(true)
        setIsSignUp(true)
    }

    return (
        <div className="overlay">
            <Nav
                authToken={authToken}
                minimal={false}
                setShowModal={setShowModal}
                showModal={showModal}
                setIsSignUp={setIsSignUp}
            />
            <div className="home">
                <h1 className="primary-title">Swipe Right®</h1>
                <button className="primary-button" onClick={handleClick}>
                    {authToken ? 'Signout' : 'Create Account'}
                </button>


                {showModal && (
                    <AuthModal setShowModal={setShowModal} isSignUp={isSignUp}/>
                )}


            </div>
        </div>
    )
}
export default Home
