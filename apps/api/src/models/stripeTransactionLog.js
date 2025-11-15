import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define('StripeTransactionLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'transactions',
        key: 'id'
      }
    },
    payment_intent_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customer_uid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gross_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    gross_amount_usd: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'usd',
    },
    fee: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    fee_usd: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    net_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    net_amount_usd: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    fee_breakdown: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    available_on: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
    },
    reporting_category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stripe_charge_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    balance_transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receipt_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    }

  }, {
    tableName: 'stripe_transaction_logs',
    timestamps: true, 
    
  });