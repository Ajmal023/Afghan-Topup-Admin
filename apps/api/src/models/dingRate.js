import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define('DingRate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    skuCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prefix: {
      type: DataTypes.STRING(3),
      allowNull: false,
      validate: { is: /^[0-9]{2,3}$/ },
    },
    rate: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    lastSynced: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    autoSyncInterval: {
      type: DataTypes.INTEGER, 
      defaultValue: 1,
    },
  }, {
    tableName: 'ding_rates',
    timestamps: true,
    // Remove the indexes array to prevent Sequelize from creating them
    // indexes: [
    //   {
    //     unique: true,
    //     fields: ['skuCode', 'prefix']
    //   }
    // ]
  });