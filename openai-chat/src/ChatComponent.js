import React, { useState } from 'react';

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh', // Full viewport height
  width: '100vw', // Full viewport width
  padding: '30px',
  backgroundColor: '#121212',
  color: '#e0e0e0',
};

const inputStyle = {
  padding: '10px',
  marginBottom: '10px',
  width: '100%',
  maxWidth: '600px', // Ensure the input doesn't grow too large
  border: '1px solid #333',
  borderRadius: '4px',
  backgroundColor: '#1e1e1e',
  color: '#e0e0e0',
};

const buttonStyle = {
  padding: '10px 20px',
  backgroundColor: '#1e88e5',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
  marginBottom: '20px', // Add margin below button
};

const buttonHoverStyle = {
  backgroundColor: '#1565c0',
};

const conversationStyle = {
  width: '100%',
  maxWidth: '600px', // Ensure conversations don't grow too large
  marginTop: '10px',
  padding: '10px',
  border: '1px solid #333',
  borderRadius: '4px',
  backgroundColor: '#1e1e1e',
  overflowY: 'auto', // Add scroll for overflow
  maxHeight: 'calc(100vh - 200px)', // Adjust the height to fit within the viewport
};

export default function Home() {
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState([]);
  const [hover, setHover] = useState(false);

  const handleClick = async () => {
    if (!input.trim()) {
      console.log('Question is required');
      return;
    }

    const newConversation = { question: input, response: '' };
    setConversations([...conversations, newConversation]);

    const response = await fetch('http://localhost:8080/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: input }),
    });

    if (!response.ok) {
      console.error('Network response was not ok');
      return;
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

    let responseText = '';
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      console.log('Received: ', chunk);
      responseText += chunk;
      setConversations((prevConversations) =>
        prevConversations.map((conv, index) =>
          index === prevConversations.length - 1
            ? { ...conv, response: responseText }
            : conv
        )
      );
    }
    setInput(''); // Clear the input after submitting
  };

  return (
    <main style={containerStyle}>
      {"pankaj gptTest"}
      <p>Ask a question:</p>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter your question..."
        style={inputStyle}
      />
      <button
        onClick={handleClick}
        style={hover ? { ...buttonStyle, ...buttonHoverStyle } : buttonStyle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        Submit
      </button>
      <div style={conversationStyle}>
        {conversations.map((conv, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <p><strong>Question:</strong> {conv.question}</p>
            <p><strong>Response:</strong></p>
            <div style={{ whiteSpace: 'pre-wrap' }}>{conv.response}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
