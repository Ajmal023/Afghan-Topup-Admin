import { Router } from "express";
import { DingTransaction, Transaction } from "../models/index.js";
import { Op, Sequelize } from "sequelize";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const dingTransactionsRouter = Router();


dingTransactionsRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status,
            startDate,
            endDate,
            phone_number,
            sortBy = "createdAt",
            sortOrder = "DESC"
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const where = {};

        if (status && status !== 'all') {
            where.status = status;
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            where.createdAt = {
                [Op.between]: [start, end]
            };
        }

        if (search) {
            where[Op.or] = [
                { transaction_id: { [Op.like]: `%${search}%` } },
                { ding_transfer_ref: { [Op.like]: `%${search}%` } },
                { phone_number: { [Op.like]: `%${search}%` } },
                { provider_txn_id: { [Op.like]: `%${search}%` } }
            ];
        }

        if (phone_number) {
            where.phone_number = { [Op.iLike]: `%${phone_number}%` };
        }

        const { count, rows: transactions } = await DingTransaction.findAndCountAll({
            where,
            include: [
                {
                    model: Transaction,
                    attributes: ['id', 'uid', 'payment_id', 'status', 'amount', 'currency']
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            offset,
            limit: parseInt(limit)
        });

        const totalPages = Math.ceil(count / parseInt(limit));

        res.json({
            data: transactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit),
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching Ding transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


dingTransactionsRouter.get("/stats", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        const where = {};
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            where.createdAt = {
                [Op.between]: [start, end]
            };
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            where.createdAt = {
                [Op.between]: [today, tomorrow]
            };
        }

        const totalTransactions = await DingTransaction.count({ where });
        
        const statusCounts = await DingTransaction.findAll({
            where,
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                [Sequelize.fn('SUM', Sequelize.col('original_amount')), 'totalOriginalAmount'],
                [Sequelize.fn('SUM', Sequelize.col('cost_amount')), 'totalCostAmount']
            ],
            group: ['status']
        });

        const totalOriginalAmount = await DingTransaction.sum('original_amount', { where });
        const totalCostAmount = await DingTransaction.sum('cost_amount', { where });
        
        const successCount = await DingTransaction.count({ 
            where: { ...where, status: 'success' } 
        });
        const successRate = totalTransactions > 0 ? (successCount / totalTransactions) * 100 : 0;

        const stats = {
            total: totalTransactions,
            totalOriginalAmount: totalOriginalAmount || 0,
            totalCostAmount: totalCostAmount || 0,
            successRate: Math.round(successRate * 100) / 100,
            byStatus: statusCounts.reduce((acc, item) => {
                acc[item.status] = {
                    count: parseInt(item.get('count')),
                    originalAmount: parseFloat(item.get('totalOriginalAmount') || 0),
                    costAmount: parseFloat(item.get('totalCostAmount') || 0)
                };
                return acc;
            }, {})
        };

        res.json({ data: stats });
    } catch (error) {
        console.error('Error fetching Ding transaction stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


dingTransactionsRouter.get("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params;

        const transaction = await DingTransaction.findByPk(id, {
            include: [
                {
                    model: Transaction,
                    attributes: ['id', 'uid', 'payment_id', 'status', 'amount', 'currency', 'createdAt']
                }
            ]
        });

        if (!transaction) {
            return res.status(404).json({ error: "Ding transaction not found" });
        }

        res.json({ data: transaction });
    } catch (error) {
        console.error('Error fetching Ding transaction:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


dingTransactionsRouter.get("/export/csv", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        const where = {};
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            where.createdAt = {
                [Op.between]: [start, end]
            };
        }

        const transactions = await DingTransaction.findAll({
            where,
            include: [
                {
                    model: Transaction,
                    attributes: ['uid', 'payment_id']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Convert to CSV
        const headers = [
            'Transaction ID',
            'Ding Transfer Ref',
            'Phone Number',
            'Original Amount',
            'Cost Amount',
            'Rate Used',
            'Status',
            'Provider TXN ID',
            'Customer UID',
            'Created At'
        ];

        const csvData = transactions.map(t => [
            t.transaction_id,
            t.ding_transfer_ref || '',
            t.phone_number,
            t.original_amount,
            t.cost_amount,
            t.rate_used,
            t.status,
            t.provider_txn_id || '',
            t.Transaction?.uid || '',
            t.createdAt
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ding-transactions-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error exporting Ding transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});