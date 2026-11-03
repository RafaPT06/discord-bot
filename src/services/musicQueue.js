const queues = new Map();
function getQueue(guildId) { return queues.get(guildId) || []; }
function addToQueue(guildId, item) { const queue = getQueue(guildId); if (queue.length >= 50) throw new Error('Queue full'); queue.push(item); queues.set(guildId, queue); return queue; }
function clearQueue(guildId) { queues.delete(guildId); }
module.exports = { getQueue, addToQueue, clearQueue };
