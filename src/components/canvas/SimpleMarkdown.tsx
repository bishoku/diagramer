import React from 'react';

interface Props {
  text: string;
  className?: string;
}

export const SimpleMarkdown: React.FC<Props> = ({ text, className = '' }) => {
  const renderLine = (line: string, index: number) => {
    if (!line.trim()) {
      return <div key={`br-${index}`} className="h-4" />;
    }

    // Very basic markdown parsing for bold, italic, and lists
    let parsedLine: React.ReactNode[] = [];
    let currentText = line;
    let keyCount = 0;

    // Check for list item
    const isListItem = currentText.startsWith('- ') || currentText.startsWith('* ');
    if (isListItem) {
      currentText = currentText.substring(2);
    }

    // A simple regex approach to find bold and italic
    const tokenRegex = /(\*\*.*?\*\*|\*.*?\*)/g;
    const parts = currentText.split(tokenRegex);

    parts.forEach((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        parsedLine.push(<strong key={keyCount++}>{part.slice(2, -2)}</strong>);
      } else if (part.startsWith('*') && part.endsWith('*')) {
        parsedLine.push(<em key={keyCount++}>{part.slice(1, -1)}</em>);
      } else {
        parsedLine.push(<span key={keyCount++}>{part}</span>);
      }
    });

    if (isListItem) {
      return (
        <div key={index} className="flex gap-2">
          <span className="select-none">•</span>
          <div>{parsedLine}</div>
        </div>
      );
    }

    return <div key={index}>{parsedLine}</div>;
  };

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {text.split('\n').map(renderLine)}
    </div>
  );
};
