import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define('DingTransaction', {
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
    ding_transfer_ref: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    processing_state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    provider_txn_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    original_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    cost_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    rate_used: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prefix: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    provider_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'pending', 'accepted'),
      allowNull: false,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cost_calculation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customer_mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    request_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    response_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    }
  }, {
    tableName: 'ding_transactions',
    timestamps: true,
    indexes: [
      {
        fields: ['transaction_id']
      },
      {
        fields: ['ding_transfer_ref']
      },
      {
        fields: ['phone_number']
      },
      {
        fields: ['createdAt']
      }
    ]
  });