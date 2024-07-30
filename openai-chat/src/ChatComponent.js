import React, { useState, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  width: '100vw',
  padding: '30px',
  backgroundColor: '#121212',
  color: '#e0e0e0',
};

const inputStyle = {
  padding: '10px',
  marginBottom: '10px',
  width: '100%',
  maxWidth: '600px',
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
  marginBottom: '20px',
};

const buttonHoverStyle = {
  backgroundColor: '#1565c0',
};

const uploadButtonStyle = {
  padding: '10px 20px',
  backgroundColor: '#1e88e5',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
  marginBottom: '10px',
};

const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px',
  marginBottom: '10px',
  width: '100%',
  maxWidth: '600px',
  border: '1px solid #333',
  borderRadius: '4px',
  backgroundColor: '#1e1e1e',
  color: '#e0e0e0',
};

const textareaStyle = {
  padding: '10px',
  marginBottom: '10px',
  width: '100%',
  maxWidth: '600px',
  border: '1px solid #333',
  borderRadius: '4px',
  backgroundColor: '#1e1e1e',
  color: '#e0e0e0',
  resize: 'vertical', // Allows resizing vertically
  overflowY: 'auto',  // Adds a scrollbar when content exceeds the height
  minHeight: '100px', // Sets a minimum height for the textarea
};

const conversationStyle = {
  width: '100%',
  maxWidth: '600px',
  marginTop: '10px',
  padding: '10px',
  border: '1px solid #333',
  borderRadius: '4px',
  backgroundColor: '#1e1e1e',
  overflowY: 'auto',
  maxHeight: 'calc(100vh - 200px)',
};

const errorStyle = {
  color: 'red',
  marginTop: '10px',
};

const codeBlockStyle = {
  position: 'relative',
  padding: '10px',
  borderRadius: '4px',
  marginBottom: '10px',
  backgroundColor: '#1e1e1e',
};

const fileTypeStyle = {
  position: 'absolute',
  left: '10px',
  top: '10px',
  backgroundColor: '#333',
  color: '#e0e0e0',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '12px',
};

const copyButtonStyle = {
  position: 'absolute',
  right: '10px',
  top: '10px',
  padding: '4px 8px',
  backgroundColor: '#1e88e5',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'background-color 0.3s',
};

const copyButtonHoverStyle = {
  backgroundColor: '#1565c0',
};

// Function to parse the response and extract code blocks
const parseResponse = (response) => {
  const parts = response.split(/```/);
  const elements = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      elements.push(<span key={`text-${i}`}>{parts[i]}</span>);
    } else {
      // Extract the file type from the first code block part
      const codeBlock = parts[i].trim();
      const [fileType, ...codeLines] = codeBlock.split('\n');
      const codeContent = codeLines.join('\n');
      
      elements.push(
        <div key={`code-${i}`} style={codeBlockStyle}>
            <div style={fileTypeStyle}>{fileType || 'jsx'}</div> 
            <button
              style={copyButtonStyle}
              onClick={() => navigator.clipboard.writeText(codeContent)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = copyButtonHoverStyle.backgroundColor}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = copyButtonStyle.backgroundColor}
              >
              Copy
            </button>
          <SyntaxHighlighter theme language={fileType || 'jsx'} style={solarizedlight}>
            {codeContent}
          </SyntaxHighlighter>
        </div>
      );
    }
  }

  return elements;
};

export default function Home() {
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState([]);
  const [hover, setHover] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  const fileInputRef = useRef(null);

  const handleClick = async () => {
    if (!input.trim()) {
      setError('Question is required');
      return;
    }
    setError('');

    const newConversation = { question: input, response: '' };
    setConversations([...conversations, newConversation]);

    if (isStreaming) {
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);

    const formData = new FormData();
    if (pdfFile) {
      formData.append('document', pdfFile);
    }
    formData.append('question', input);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/upload1`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit question and file');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line

        console.log('Lines:', lines); // Debug: Check the lines received

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const jsonStr = line.slice(5).trim();
            console.log('JSON String:', jsonStr); // Debug: Check the JSON string

            if (jsonStr === '[DONE]') {
              setIsStreaming(false);
              setInput('');
              setPdfFile(null);
              return;
            }

            try {
              const message = JSON.parse(jsonStr);
              console.log('Parsed Message:', message); // Debug: Check the parsed message

              // Ensure that the content exists and is a string
              const content = typeof message.content === 'string' ? message.content : '';

              setConversations((prevConversations) =>
                prevConversations.map((conv, index) =>
                  index === prevConversations.length - 1
                    ? { ...conv, response: conv.response + content }
                    : conv
                )
              );
            } catch (error) {
              console.error('Error parsing JSON:', error.message);
              setError('An error occurred while processing the response.');
            }
          }
        }
      }
    } catch (error) {
      setError(error.message || 'An error occurred while processing your request.');
      console.error('Error during submission:', error);
      setIsStreaming(false);
    }

    setInput('');
    setPdfFile(null);
  };

  const handleStop = () => {
    setIsStreaming(false);
  };

  const handleFileChange = (e) => {
    setPdfFile(e.target.files[0]);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleRemoveFile = () => {
    setPdfFile(null);
  };

  return (
    <main style={containerStyle}>
      {!pdfFile ? (
        <>
          <button
            onClick={handleUploadClick}
            style={hover ? { ...uploadButtonStyle, ...buttonHoverStyle } : uploadButtonStyle}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            Upload file 
          </button>
          <input
            type="file"
            // accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </>
      ) : (
        <div style={cardStyle}>
          <p>Uploaded PDF: {pdfFile.name}</p>
          <button
            onClick={handleRemoveFile}
            style={hover ? { ...uploadButtonStyle, ...buttonHoverStyle } : uploadButtonStyle}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            Remove File
          </button>
        </div>
      )}
      {error && <p style={errorStyle}>{error}</p>}

      <p>Ask a question:</p>
      {/* <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter your question..."
        style={inputStyle}
      /> */}
        <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter your question... or upload a file and ask question"
        style={textareaStyle}
      />
      <button
        onClick={handleClick}
        style={hover ? { ...buttonStyle, ...buttonHoverStyle } : buttonStyle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {isStreaming ? 'Stop' : 'Submit'}
      </button>
      {isStreaming && (
        <button
          onClick={handleStop}
          style={hover ? { ...buttonStyle, ...buttonHoverStyle } : buttonStyle}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          Stop
        </button>
      )}
      <div style={conversationStyle}>
        {conversations.map((conv, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <p><strong>Question:</strong> {conv.question}</p>
            <p><strong>Response:</strong></p>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {parseResponse(conv.response)}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
