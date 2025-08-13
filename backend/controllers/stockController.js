
const Stock = require('../models/Stock');

// const getStocks = async (req, res) => {
//     try {
//         const stocks = await Stock.find({ status: 1 });
//         res.json(stocks);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// const checkLowStock = async (req, res) => {
//     try {
//         const stocks = await Stock.find({ status: 1, quantity: { $lt: 10 } });
//         res.json(stocks);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

const addStock = async (req, res) => {
    const { title, quantity, createDate, status,updateDate } = req.body;
    try {
        const stock = await Stock.create({ managerId: req.admin.id, title, quantity, createDate, status, updateDate});
        res.status(201).json(stock);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// const updateStock = async (req, res) => {
//     const {  title, quantity, createDate, status, updateDate } = req.body;
//     console.log(req.body)
//     const managerId = req.admin.id
//     try {
//         const stock = await Stock.findById(req.params.id);
//         if (!stock) return res.status(404).json({ message: 'Task not found' });
//         stock.title = title || stock.title;
//         stock.quantity = quantity || stock.quantity; 
//         stock.createDate = createDate || stock.createDate; 
//         stock.status = status; 
//         stock.updateDate = updateDate || stock.updateDate;
//         stock.managerId = managerId || stock.managerId;
//         const updatedStock = await stock.save();
//         res.json(updatedStock);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

module.exports = { getStocks, checkLowStock, addStock, updateStock };
