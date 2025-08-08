/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solana_programs.json`.
 */
export type SolanaPrograms = {
  "address": "3QrZkcW2REEEjGjzRy8Ccedq8GjQMPkKAoxdbi4nf88n",
  "metadata": {
    "name": "solanaPrograms",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimRewards",
      "docs": [
        "Service provider claims accrued rewards (linear release over time)"
      ],
      "discriminator": [
        4,
        144,
        132,
        71,
        116,
        23,
        151,
        80
      ],
      "accounts": [
        {
          "name": "deposit",
          "writable": true
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "serviceProvider",
          "signer": true
        },
        {
          "name": "serviceProviderWallet",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "createDeposit",
      "docs": [
        "User creates a deposit for file storage"
      ],
      "discriminator": [
        157,
        30,
        11,
        129,
        16,
        166,
        115,
        75
      ],
      "accounts": [
        {
          "name": "deposit",
          "writable": true
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "contentCid",
          "type": "string"
        },
        {
          "name": "fileSize",
          "type": "u64"
        },
        {
          "name": "durationDays",
          "type": "u32"
        },
        {
          "name": "depositAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeConfig",
      "docs": [
        "Initialize the global config (admin only)"
      ],
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "adminKey",
          "type": "pubkey"
        },
        {
          "name": "ratePerBytePerDay",
          "type": "u64"
        },
        {
          "name": "minDurationDays",
          "type": "u32"
        },
        {
          "name": "withdrawalWallet",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateMinDuration",
      "docs": [
        "Update minimum duration (admin only)"
      ],
      "discriminator": [
        174,
        164,
        81,
        38,
        48,
        254,
        219,
        189
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newMinDuration",
          "type": "u32"
        }
      ]
    },
    {
      "name": "updateRate",
      "docs": [
        "Update the rate (admin only)"
      ],
      "discriminator": [
        24,
        225,
        53,
        189,
        72,
        212,
        225,
        178
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newRate",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawFees",
      "docs": [
        "Admin withdraws accumulated fees"
      ],
      "discriminator": [
        198,
        212,
        171,
        109,
        144,
        215,
        174,
        89
      ],
      "accounts": [
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "withdrawalWallet",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        148,
        146,
        121,
        66,
        207,
        173,
        21,
        227
      ]
    },
    {
      "name": "escrowVault",
      "discriminator": [
        54,
        84,
        41,
        149,
        160,
        181,
        85,
        114
      ]
    }
  ],
  "events": [
    {
      "name": "depositCreated",
      "discriminator": [
        146,
        225,
        181,
        133,
        194,
        173,
        54,
        71
      ]
    },
    {
      "name": "feesWithdrawn",
      "discriminator": [
        234,
        15,
        0,
        119,
        148,
        241,
        40,
        21
      ]
    },
    {
      "name": "minDurationUpdated",
      "discriminator": [
        164,
        63,
        86,
        59,
        254,
        77,
        38,
        77
      ]
    },
    {
      "name": "rateUpdated",
      "discriminator": [
        215,
        212,
        25,
        235,
        152,
        203,
        38,
        205
      ]
    },
    {
      "name": "rewardsClaimed",
      "discriminator": [
        75,
        98,
        88,
        18,
        219,
        112,
        88,
        121
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "durationTooShort",
      "msg": "Duration must be at least the minimum required days"
    },
    {
      "code": 6001,
      "name": "insufficientDeposit",
      "msg": "Deposit amount is insufficient for the storage cost (size × duration × rate)"
    },
    {
      "code": 6002,
      "name": "unauthorizedAdmin",
      "msg": "Only the program admin can perform this action"
    },
    {
      "code": 6003,
      "name": "nothingToClaim",
      "msg": "No rewards are available to claim at this time"
    },
    {
      "code": 6004,
      "name": "storageExpired",
      "msg": "Storage duration has expired"
    },
    {
      "code": 6005,
      "name": "invalidFileSize",
      "msg": "Invalid file size - must be greater than 0"
    },
    {
      "code": 6006,
      "name": "invalidDuration",
      "msg": "Invalid duration - must be greater than 0"
    },
    {
      "code": 6007,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow occurred"
    },
    {
      "code": 6008,
      "name": "insufficientEscrowFunds",
      "msg": "Insufficient funds in escrow vault"
    },
    {
      "code": 6009,
      "name": "invalidCid",
      "msg": "Invalid CID format"
    }
  ],
  "types": [
    {
      "name": "config",
      "docs": [
        "Global configuration account - stores system-wide parameters"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "adminKey",
            "docs": [
              "Public key of the admin who can update settings"
            ],
            "type": "pubkey"
          },
          {
            "name": "ratePerBytePerDay",
            "docs": [
              "Cost per byte per day in lamports (e.g., 1000 lamports per byte per day)"
            ],
            "type": "u64"
          },
          {
            "name": "minDurationDays",
            "docs": [
              "Minimum storage duration in days (e.g., 30 days minimum)"
            ],
            "type": "u32"
          },
          {
            "name": "withdrawalWallet",
            "docs": [
              "Wallet address where admin fees are withdrawn to"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "deposit",
      "docs": [
        "Individual deposit record - one per user per file"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "depositKey",
            "docs": [
              "Public key of the user who made the deposit"
            ],
            "type": "pubkey"
          },
          {
            "name": "contentCid",
            "docs": [
              "Content Identifier (CID) of the stored file"
            ],
            "type": "string"
          },
          {
            "name": "fileSize",
            "docs": [
              "Size of the file in bytes"
            ],
            "type": "u64"
          },
          {
            "name": "durationDays",
            "docs": [
              "How many days the file should be stored"
            ],
            "type": "u32"
          },
          {
            "name": "depositAmount",
            "docs": [
              "Total amount deposited in lamports"
            ],
            "type": "u64"
          },
          {
            "name": "depositSlot",
            "docs": [
              "Solana slot when the deposit was made"
            ],
            "type": "u64"
          },
          {
            "name": "lastClaimedSlot",
            "docs": [
              "Last slot when rewards were claimed (for linear release calculation)"
            ],
            "type": "u64"
          },
          {
            "name": "totalClaimed",
            "docs": [
              "Total amount claimed so far in lamports"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "depositCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "contentCid",
            "type": "string"
          },
          {
            "name": "fileSize",
            "type": "u64"
          },
          {
            "name": "durationDays",
            "type": "u32"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "slot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "escrowVault",
      "docs": [
        "Central escrow vault that holds all user deposits"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalDeposits",
            "docs": [
              "Total lamports deposited by all users"
            ],
            "type": "u64"
          },
          {
            "name": "totalClaimed",
            "docs": [
              "Total lamports claimed by service providers"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "feesWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "slot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "minDurationUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oldDuration",
            "type": "u32"
          },
          {
            "name": "newDuration",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "rateUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oldRate",
            "type": "u64"
          },
          {
            "name": "newRate",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "rewardsClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "depositKey",
            "type": "pubkey"
          },
          {
            "name": "serviceProvider",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "slot",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
