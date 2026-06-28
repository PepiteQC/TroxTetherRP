**// C:\\troxtetherworld\\server\\kernel\\intellectus\\README.md**

**# TroxT Intellectus Pack 4.0**



**## Les 5 Noyaux**



**### Arcadius — Bus d'événements**

**```javascript**

**bus.on('player:join', handler);**

**bus.emit('player:join', { id: '123' }, 'high');**

**bus.waitFor('world:ready', 5000);**

