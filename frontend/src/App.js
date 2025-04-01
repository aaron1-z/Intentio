// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // We'll use the same CSS file name

// Your backend API URL
const API_URL = "http://localhost:5000";
const MAX_INTENTIONS = 3; // Let's set a limit for daily focus

function App() {
  // State variables
  const [intentions, setIntentions] = useState([]); // Renamed from tasks
  const [intentionTitle, setIntentionTitle] = useState(""); // Renamed input state
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");

  // --- Fetch Intentions (Previously Tasks) ---
  useEffect(() => {
    const fetchIntentions = () => {
      if (!token) {
        setIntentions([]);
        return;
      }
      axios.get(`${API_URL}/tasks`, { // Still uses the /tasks backend route for now
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => {
          // **Concept Adaptation:** For now, we treat all fetched tasks as potential intentions.
          // A future improvement would be to filter/fetch only today's intentions if the backend supports dates.
          setIntentions(res.data);
          setError("");
        })
        .catch(err => {
          console.error("Error fetching intentions:", err);
          setError("Could not fetch intentions. Session might have expired.");
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            handleLogout();
          }
        });
    };

    fetchIntentions();
  }, [token]);

  // --- Authentication Handlers (No change needed) ---
  const handleRegister = async (e) => {
    e.preventDefault(); setError("");
    try {
      await axios.post(`${API_URL}/register`, { username, password });
      alert("Registration successful! Please log in.");
      setIsRegistering(false); setUsername(""); setPassword("");
    } catch (err) {
      console.error("Registration error:", err.response?.data?.message || err.message);
      setError(err.response?.data?.message || "Registration failed.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setError("");
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      setUsername(""); setPassword("");
    } catch (err) {
      console.error("Login error:", err.response?.data?.message || err.message);
      setError(err.response?.data?.message || "Login failed.");
      localStorage.removeItem("token"); setToken(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token"); setToken(null); setError("");
  };

  // --- Intention Handlers (Adapted from Tasks) ---
  const addIntention = async (e) => {
    e.preventDefault();
    if (!intentionTitle.trim()) return;
    // **Concept Adaptation:** Check if the limit is reached
    if (intentions.filter(int => !int.completed).length >= MAX_INTENTIONS) {
        setError(`Focus! Limit your daily intentions to ${MAX_INTENTIONS}. Complete one first.`);
        return;
    }
    setError("");
    try {
      // Still posts to the /tasks backend route
      const res = await axios.post(`${API_URL}/tasks`,
        { title: intentionTitle }, // Sending 'title' as the backend expects
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIntentions([...intentions, res.data]);
      setIntentionTitle(""); // Clear input
    } catch (err) {
      console.error("Error adding intention:", err.response?.data?.message || err.message);
      setError("Failed to add intention.");
    }
  };

  const toggleComplete = async (intentionId, currentCompletedStatus) => {
    setError("");
    try {
      // Still updates using the /tasks/:id backend route
      await axios.put(`${API_URL}/tasks/${intentionId}`,
        { completed: !currentCompletedStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIntentions(intentions.map(int =>
        int._id === intentionId ? { ...int, completed: !currentCompletedStatus } : int
      ));
       // Clear error if completing an item allows adding more
       if (!currentCompletedStatus && intentions.filter(int => !int.completed).length <= MAX_INTENTIONS) {
        setError("");
      }
    } catch (err) {
        console.error("Error updating intention:", err.response?.data?.message || err.message);
        setError("Failed to update intention status.");
    }
  }

  const deleteIntention = async (intentionId) => {
    setError("");
    if (!window.confirm("Remove this intention?")) return;
    try {
      // Still deletes using the /tasks/:id backend route
      await axios.delete(`${API_URL}/tasks/${intentionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIntentions(intentions.filter(int => int._id !== intentionId));
       // Clear error if deleting an item allows adding more
      if (intentions.filter(int => !int.completed).length <= MAX_INTENTIONS) {
        setError("");
      }
    } catch (err) {
      console.error("Error deleting intention:", err.response?.data?.message || err.message);
      setError("Failed to delete intention.");
    }
  };

  // --- Render Logic ---
  const incompleteIntentions = intentions.filter(int => !int.completed);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Intentio</h1> {/* // Changed Title */}
        {token && <button onClick={handleLogout} className="logout-button">Logout</button>}
      </header>

      <main className="App-main">
        {error && <p className="error-message">Notice: {error}</p>} {/* // Changed prefix */}

        {!token ? (
          // Auth forms remain the same
          <div className="auth-container">
            <h2>{isRegistering ? "Register" : "Login"}</h2>
            <form onSubmit={isRegistering ? handleRegister : handleLogin}>
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="auth-button">{isRegistering ? "Register" : "Login"}</button>
            </form>
            <button onClick={() => setIsRegistering(!isRegistering)} className="toggle-auth-button">
              {isRegistering ? "Already have an account? Login" : "Don't have an account? Register"}
            </button>
          </div>
        ) : (
          // Main app view - adapted for Intentions
          <div className="intentions-container"> {/* // Renamed class */}
            <h2>Today's Focus ({incompleteIntentions.length}/{MAX_INTENTIONS})</h2> {/* // Updated heading */}

            {/* Only show Add form if limit not reached */}
            {incompleteIntentions.length < MAX_INTENTIONS ? (
              <form onSubmit={addIntention} className="add-intention-form"> {/* // Renamed class */}
                <input
                  type="text"
                  value={intentionTitle}
                  onChange={(e) => setIntentionTitle(e.target.value)}
                  placeholder="What is your intention?" // Updated placeholder
                  required
                />
                <button type="submit">Set Intention</button> {/* // Updated button text */}
              </form>
            ) : (
              <p className="limit-reached-message">Focus on your current intentions! Complete one to add another.</p>
            )}

            {/* // Renamed class */}
            <ul className="intention-list">
              {intentions.length === 0 && <p>Set your first intention for today!</p>}
              {/* Show incomplete first, then completed */}
              {[...intentions.filter(int => !int.completed), ...intentions.filter(int => int.completed)].map(intention => (
                // Renamed class, logic remains similar
                <li key={intention._id} className={`intention-item ${intention.completed ? 'completed' : ''}`}>
                  <span onClick={() => toggleComplete(intention._id, intention.completed)} className="intention-title">
                     {intention.title}
                  </span>
                  {/* // Renamed class */}
                  <button onClick={() => deleteIntention(intention._id)} className="delete-button">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;