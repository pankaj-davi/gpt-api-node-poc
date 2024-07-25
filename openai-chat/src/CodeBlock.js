import React, { useState } from 'react';

const codeBlockStyle = {
  position: 'relative',
  backgroundColor: '#1e1e1e',
  color: '#e0e0e0',
  border: '1px solid #333',
  borderRadius: '4px',
  padding: '10px',
  overflowX: 'auto',
  width: '100%',
  height: '100%',
};

const codeStyle = {
  whiteSpace: 'pre-wrap',
};

const copyButtonStyle = {
  position: 'absolute',
  right: '10px',
  top: '10px',
  padding: '5px 10px',
  backgroundColor: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
};

const copyButtonHoverStyle = {
  backgroundColor: '#0056b3',
};

const CodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
    });
  };

  return (
    <div style={codeBlockStyle}>
      <pre>
        <code style={codeStyle}>{code}</code>
      </pre>
      <button
        onClick={copyToClipboard}
        style={copied ? { ...copyButtonStyle, ...copyButtonHoverStyle } : copyButtonStyle}
        onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
        onMouseLeave={(e) => (e.target.style.backgroundColor = '#007bff')}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

export default CodeBlock;
