// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.4;

import {SafeTransferLib} from '../../libraries/SafeTransferLib.sol';

import {ISportsClubAccessManager} from '../../interfaces/ISportsClubAccessManager.sol';
import {ISportsClubShareManager} from '../../interfaces/ISportsClubShareManager.sol';
import {IERC20permit} from '../../interfaces/IERC20permit.sol';

import {SportsClubOwnable} from '../../access/SportsClubOwnable.sol';

import {Multicall} from '../../utils/Multicall.sol';
import {ReentrancyGuard} from '../../utils/ReentrancyGuard.sol';

/// @notice Crowdsale contract that receives ETH or ERC-20 to mint registered DAO tokens, including merkle access lists
contract SportsClubDAOcrowdsale is SportsClubOwnable, Multicall, ReentrancyGuard {
    /// -----------------------------------------------------------------------
    /// Library Usage
    /// -----------------------------------------------------------------------

    using SafeTransferLib for address;

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event ExtensionSet(
        address indexed dao, 
        uint256 listId, 
        uint8 purchaseMultiplier, 
        address purchaseAsset, 
        uint32 saleEnds, 
        uint96 purchaseLimit, 
        uint96 personalLimit,
        string details
    );
    event ExtensionCalled(address indexed dao, address indexed purchaser, uint256 amountOut);
    event SportsClubRateSet(uint8 sportsclubRate);

    /// -----------------------------------------------------------------------
    /// Errors
    /// -----------------------------------------------------------------------

    error NullMultiplier();
    error SaleEnded();
    error NotListed();
    error PurchaseLimit();
    error PersonalLimit();
    error RateLimit();

    /// -----------------------------------------------------------------------
    /// Sale Storage
    /// -----------------------------------------------------------------------
 
    uint8 private sportsclubRate;
    ISportsClubAccessManager private immutable accessManager;
    address private immutable wETH;

    mapping(address => Crowdsale) public crowdsales;

    struct Crowdsale {
        uint256 listId;
        uint8 purchaseMultiplier;
        address purchaseAsset;
        uint32 saleEnds;
        uint96 purchaseLimit;
        uint96 personalLimit;
        uint256 purchaseTotal;
        string details;
        mapping(address => uint256) personalPurchased;
    }

    function checkPersonalPurchased(address account, address dao) external view returns (uint256) {
        return crowdsales[dao].personalPurchased[account];
    }

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor(ISportsClubAccessManager accessManager_, address wETH_) {
        accessManager = accessManager_;
        SportsClubOwnable._init(msg.sender);
        wETH = wETH_;
    }

    /// -----------------------------------------------------------------------
    /// Multicall Utilities
    /// -----------------------------------------------------------------------

    function joinList(uint256 id, bytes32[] calldata merkleProof) external payable {
        accessManager.joinList(
            msg.sender,
            id,
            merkleProof
        );
    }

    function setPermit(
        IERC20permit token, 
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r, 
        bytes32 s
    ) external payable {
        token.permit(
            msg.sender,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );
    }

    /// -----------------------------------------------------------------------
    /// Sale Settings
    /// -----------------------------------------------------------------------

    function setExtension(bytes calldata extensionData) external payable {
        (
            uint256 listId, 
            uint8 purchaseMultiplier,
            address purchaseAsset, 
            uint32 saleEnds, 
            uint96 purchaseLimit, 
            uint96 personalLimit,
            string memory details
        ) 
            = abi.decode(extensionData, (uint256, uint8, address, uint32, uint96, uint96, string));
        
        if (purchaseMultiplier == 0) revert NullMultiplier();

        // caller is stored as `dao` target for sale
        Crowdsale storage sale = crowdsales[msg.sender];
        // we use this format as we have nested mapping
        sale.listId = listId;
        sale.purchaseMultiplier = purchaseMultiplier;
        sale.purchaseAsset = purchaseAsset;
        sale.saleEnds = saleEnds;
        sale.purchaseLimit = purchaseLimit;
        sale.personalLimit = personalLimit;
        sale.details = details;

        emit ExtensionSet(msg.sender, listId, purchaseMultiplier, purchaseAsset, saleEnds, purchaseLimit, personalLimit, details);
    }

    /// -----------------------------------------------------------------------
    /// Sale Logic
    /// -----------------------------------------------------------------------

    function callExtension(address dao, uint256 amount) external payable nonReentrant returns (uint256 amountOut) {
        Crowdsale storage sale = crowdsales[dao];

        if (block.timestamp > sale.saleEnds) revert SaleEnded();

        if (sale.listId != 0) 
            if (accessManager.balanceOf(msg.sender, sale.listId) == 0) revert NotListed();

        uint256 total;
        uint256 payment;

        if (sale.purchaseAsset == address(0) || sale.purchaseAsset == address(0xDead)) {
            total = msg.value;
        } else {
            total = amount;
        }

        if (sportsclubRate != 0) {
            uint256 fee = (total * sportsclubRate) / 100;
            // cannot underflow since fee will be less than total
            unchecked { 
                payment = total - fee;
            }
        } else {
            payment = total;
        }

        amountOut = total * sale.purchaseMultiplier;

        if (sale.purchaseTotal + amountOut > sale.purchaseLimit) revert PurchaseLimit();
        if (sale.personalPurchased[msg.sender] + amountOut > sale.personalLimit) revert PersonalLimit();
    
        if (sale.purchaseAsset == address(0)) {
            // send ETH to DAO
            dao._safeTransferETH(payment);
        } else if (sale.purchaseAsset == address(0xDead)) {
            // send ETH to wETH
            wETH._safeTransferETH(payment);
            // send wETH to DAO
            wETH._safeTransfer(dao, payment);
        } else {
            // send tokens to DAO
            sale.purchaseAsset._safeTransferFrom(msg.sender, dao, payment);
        }
        
        sale.purchaseTotal += amountOut;
        sale.personalPurchased[msg.sender] += amountOut;
            
        ISportsClubShareManager(dao).mintShares(msg.sender, amountOut);

        emit ExtensionCalled(dao, msg.sender, amountOut);
    }

    /// -----------------------------------------------------------------------
    /// Sale Management
    /// -----------------------------------------------------------------------

    function setSportsClubRate(uint8 sportsclubRate_) external payable onlyOwner {
        if (sportsclubRate_ > 100) revert RateLimit();
        sportsclubRate = sportsclubRate_;
        emit SportsClubRateSet(sportsclubRate_);
    }

    function claimSportsClubFees(
        address to, 
        address asset, 
        uint256 amount
    ) external payable onlyOwner {
        if (asset == address(0)) {
            to._safeTransferETH(amount);
        } else {
            asset._safeTransfer(to, amount);
        }
    }
}
