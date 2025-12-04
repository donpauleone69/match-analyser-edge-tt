import React, { useState } from 'react';
import { useDrag } from '@use-gesture/react';

const GesturePad = () => {
  const [log, setLog] = useState('');

  const bind = useDrag(({ down, movement: [mx, my], elapsedTime }) => {
    // If the pointer is still down and it’s been more than 500ms, we consider it a hold
    const isHold = down && elapsedTime > 500;

    if (isHold) {
      setLog('Hold detected...');
    }

    // Once the hold is done and the user starts moving, detect swipe
    if (!down && elapsedTime > 500) {
      let swipeDirection = '';
      if (Math.abs(mx) > Math.abs(my)) {
        swipeDirection = mx > 0 ? 'swipe right' : 'swipe left';
      } else {
        swipeDirection = my > 0 ? 'swipe down' : 'swipe up';
      }
      setLog(`Hold and then ${swipeDirection}`);
    }
  });

  return (
    <div style={styles.container}>
      {/* Top area for logs */}
      <div style={styles.logArea}>{log}</div>

      {/* Gesture pad area */}
      <div style={styles.wrapper}>
        <div {...bind()} style={styles.gesturePad}>
          {/* Column and row labels, zones as before */}
          <div style={styles.columnLabel}>BH</div>
          <div style={styles.columnLabel}>FH</div>
          <div style={styles.rowLabel}>Aggressive</div>
          <div style={styles.rowLabel}>Neutral</div>
          <div style={styles.rowLabel}>Passive</div>
          {/* ... the six boxes ... */}
          {[1, 2, 3, 4, 5, 6].map((boxId) => (
            <div key={boxId} style={styles.zone}>
              Box {boxId}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  logArea: {
    height: '70vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '16px',
    borderBottom: '1px solid #ccc',
  },
  wrapper: {
    height: '30vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  gesturePad: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr 1fr',
    gridTemplateRows: 'auto 1fr 1fr 1fr',
    width: '80%',
    maxWidth: '400px',
    border: '2px solid #000',
    touchAction: 'none',
  },
  columnLabel: { /* ... */ },
  rowLabel: { /* ... */ },
  zone: { /* ... */ },
};

export default GesturePad;
