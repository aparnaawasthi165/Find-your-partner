import axios from "axios";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";

const MatchesDisplay = ({ matches, setClickedUser }) => {
  const [matchedProfiles, setMatchedProfiles] = useState([]);
  const [cookies] = useCookies(["UserId"]);
  const [concatenatedID, setConcatenatedID] = useState(null);
  const matchedUserIds = matches.map(({ user_id }) => user_id);
  const userId = cookies.UserId;

  useEffect(() => {
    const getMatches = async () => {
      try {
        const response = await axios.get("http://localhost:8000/users", {
          params: { userIds: JSON.stringify(matchedUserIds) },
        });
        setMatchedProfiles(response.data);
      } catch (error) {
        console.log(error);
      }
    };

    getMatches();
  }, [matchedUserIds]);

  const generateUniqueConversationID = (userId, matchedUserId) => {
    // Concatenate user IDs in a consistent order
    const conversationID =
      userId < matchedUserId
        ? userId.toString() + matchedUserId.toString()
        : matchedUserId.toString() + userId.toString();

    setConcatenatedID(conversationID);
  };

  const openChatLink = () => {
    // Replace the empty string with your chat link URL
    window.open("https://illustrious-lamington-0b29bb.netlify.app/", "_blank"); // Opens the URL in a new tab or window
    //Github Link to the chat app- "https://github.com/aparnaawasthi165/Cloud-Chat"
  };

  return (
    <div className="matches-display">
      {matchedProfiles.map((match, index) => (
        <div
          key={index}
          className="match-card"
          onClick={() => setClickedUser(match)}
        >
          <div className="img-container">
            <p onClick={() => generateUniqueConversationID(userId, match.user_id)}>
              {concatenatedID
                ? `Your unique conversation ID: ${concatenatedID}`
                : "Click here to generate a unique conversation ID"}
            </p>
  //Github link to chat app :https://github.com/aparnaawasthi165/CloudChat
            <img src={match?.url} alt={`${match?.first_name} profile`} />
          </div>
          <h3 onClick={openChatLink}>{match?.first_name}</h3>
        </div>
      ))}
    </div>
  );
};

export default MatchesDisplay;
