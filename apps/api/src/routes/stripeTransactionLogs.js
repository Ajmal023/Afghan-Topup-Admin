import { Router } from "express";
import { StripeTransactionLog, Transaction } from "../models/index.js";
import { Op, Sequelize } from "sequelize";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const stripeTransactionLogsRouter = Router();


stripeTransactionLogsRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status,
            startDate,
            endDate,
            customer_uid,
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
                { payment_intent_id: { [Op.like]: `%${search}%` } },
                { customer_uid: { [Op.like]: `%${search}%` } },
                { stripe_charge_id: { [Op.like]: `%${search}%` } },
                { balance_transaction_id: { [Op.like]: `%${search}%` } }
            ];
        }

        if (customer_uid) {
            where.customer_uid = { [Op.like]: `%${customer_uid}%` };
        }

        const { count, rows: logs } = await StripeTransactionLog.findAndCountAll({
            where,
            include: [
                {
                    model: Transaction,
                    attributes: ['id', 'uid', 'payment_id', 'status', 'amount', 'currency', 'phone_number']
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            offset,
            limit: parseInt(limit)
        });

        const totalPages = Math.ceil(count / parseInt(limit));

        res.json({
            data: logs,
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
        console.error('Error fetching Stripe transaction logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


stripeTransactionLogsRouter.get("/stats", requireAuth, requireRole("admin"), async (req, res, next) => {
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
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            where.createdAt = {
                [Op.gte]: thirtyDaysAgo
            };
        }

        const totalTransactions = await StripeTransactionLog.count({ where });
        
        const statusCounts = await StripeTransactionLog.findAll({
            where,
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                [Sequelize.fn('SUM', Sequelize.col('gross_amount')), 'totalGrossAmount'],
                [Sequelize.fn('SUM', Sequelize.col('fee')), 'totalFees'],
                [Sequelize.fn('SUM', Sequelize.col('net_amount')), 'totalNetAmount']
            ],
            group: ['status']
        });

        const totalGrossAmount = await StripeTransactionLog.sum('gross_amount', { where });
        const totalFees = await StripeTransactionLog.sum('fee', { where });
        const totalNetAmount = await StripeTransactionLog.sum('net_amount', { where });

        const stats = {
            total: totalTransactions,
            totalGrossAmount: totalGrossAmount || 0,
            totalFees: totalFees || 0,
            totalNetAmount: totalNetAmount || 0,
            averageFeePercentage: totalGrossAmount > 0 ? ((totalFees / totalGrossAmount) * 100) : 0,
            byStatus: statusCounts.reduce((acc, item) => {
                acc[item.status] = {
                    count: parseInt(item.get('count')),
                    grossAmount: parseFloat(item.get('totalGrossAmount') || 0),
                    fees: parseFloat(item.get('totalFees') || 0),
                    netAmount: parseFloat(item.get('totalNetAmount') || 0)
                };
                return acc;
            }, {})
        };

        res.json({ data: stats });
    } catch (error) {
        console.error('Error fetching Stripe transaction stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


stripeTransactionLogsRouter.get("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params;

        const log = await StripeTransactionLog.findByPk(id, {
            include: [
                {
                    model: Transaction,
                    attributes: ['id', 'uid', 'payment_id', 'status', 'amount', 'currency', 'phone_number', 'createdAt']
                }
            ]
        });

        if (!log) {
            return res.status(404).json({ error: "Stripe transaction log not found" });
        }

        res.json({ data: log });
    } catch (error) {
        console.error('Error fetching Stripe transaction log:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


stripeTransactionLogsRouter.get("/export/csv", requireAuth, requireRole("admin"), async (req, res, next) => {
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

        const logs = await StripeTransactionLog.findAll({
            where,
            include: [
                {
                    model: Transaction,
                    attributes: ['uid', 'phone_number']
                }
            ],
            order: [['createdAt', 'DESC']]
        });


        const headers = [
            'Log ID',
            'Payment Intent ID',
            'Customer UID',
            'Gross Amount',
            'Gross Amount USD',
            'Fee',
            'Fee USD',
            'Net Amount',
            'Net Amount USD',
            'Currency',
            'Status',
            'Available On',
            'Stripe Charge ID',
            'Balance Transaction ID',
            'Created At'
        ];

        const csvData = logs.map(log => [
            log.id,
            log.payment_intent_id,
            log.customer_uid,
            log.gross_amount,
            log.gross_amount_usd,
            log.fee,
            log.fee_usd,
            log.net_amount,
            log.net_amount_usd,
            log.currency,
            log.status,
            log.available_on,
            log.stripe_charge_id || '',
            log.balance_transaction_id || '',
            log.createdAt
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=stripe-transaction-logs-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error exporting Stripe transaction logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});