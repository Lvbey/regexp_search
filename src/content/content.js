// Master-Slave Architecture Implementation for Handling Multiple Iframes

class MasterIframe {
  constructor() {
    this.slaves = [];
  }

  addSlave(slave) {
    this.slaves.push(slave);
  }

  sendMessageToSlaves(message) {
    this.slaves.forEach((slave) => {
      slave.receiveMessage(message);
    });
  }
}

class SlaveIframe {
  constructor(name, master) {
    this.name = name;
    this.master = master;
    this.master.addSlave(this);
  }

  receiveMessage(message) {
    console.log(`Slave ${this.name} received message: ${message}`);
  }

  sendMessageToMaster(message) {
    console.log(`Slave ${this.name} sending message to master: ${message}`);
    this.master.sendMessageToSlaves(message);
  }
}

// Example usage:
const master = new MasterIframe();
const slave1 = new SlaveIframe('A', master);
const slave2 = new SlaveIframe('B', master);

slave1.sendMessageToMaster('Hello from Slave A!');
slave2.sendMessageToMaster('Hello from Slave B!');