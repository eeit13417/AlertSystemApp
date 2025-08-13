const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    title: { type: String, required: true },
    quantity: { type:Number, required: true, default: 0},
    status: { type: Number, default: 0, required: true  },
    createDate: { type: Date, required: true },
    updateDate: { type: Date},
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true },
});

module.exports = mongoose.model('Stock', stockSchema);