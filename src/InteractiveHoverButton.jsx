import React, { useRef, useEffect } from 'react';

export const InteractiveHoverButton = ({
  children,
  className = '',
  onClick,
  href,
  to,
  type = 'button',
  disabled = false,
  ...props
}) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleMouseMove = (e) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      button.style.setProperty('--mouse-x', `${x}px`);
      button.style.setProperty('--mouse-y', `${y}px`);
    };

    const handleMouseEnter = () => {
      button.classList.add('interactive-hover-active');
    };

    const handleMouseLeave = () => {
      button.classList.remove('interactive-hover-active');
    };

    button.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      button.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const finalClassName = `interactive-hover-button ${className}`;

  // Handle different button types (link, native button, etc.)
  if (href) {
    return (
      <a
        ref={buttonRef}
        href={href}
        className={finalClassName}
        onClick={onClick}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={buttonRef}
      type={type}
      className={finalClassName}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default InteractiveHoverButton;
