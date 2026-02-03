// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 20491192805390485299153009773594534940189261866228447918068658471970481763042;
    uint256 constant alphay  = 9383485363053290200918347156157836566562967994039712273449902621266178545958;
    uint256 constant betax1  = 4252822878758300859123897981450591353533073413197771768651442665752259397132;
    uint256 constant betax2  = 6375614351688725206403948262868962793625744043794305715222011528459656738731;
    uint256 constant betay1  = 21847035105528745403288232691147584728191162732299865338377159692350059136679;
    uint256 constant betay2  = 10505242626370262277552901082094356697409835680220590971873171140371331206856;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 2062722375267688155506518698189439370663065617485510025984994138358005095384;
    uint256 constant deltax2 = 11014538908960536842613771721447426489335618411067735450418976287193686484556;
    uint256 constant deltay1 = 14562572514076331697398633454108997977836108255938812550639222456146802685358;
    uint256 constant deltay2 = 12011376287249349747130202485488380962618228641527063144432430203446677863070;

    
    uint256 constant IC0x = 4128938446057188698434216405994532971751624601128105408415269723366938741626;
    uint256 constant IC0y = 5962601762633809239051292355026594229073530880874540926898496993250544034793;
    
    uint256 constant IC1x = 18523254132065479117442886092543557033944897965594987553592009866215752734756;
    uint256 constant IC1y = 6104825548678514658412900186726295570730915334302646304531618739363499760904;
    
    uint256 constant IC2x = 937008122889267293560823604760546089517093575688626498576767627531695637459;
    uint256 constant IC2y = 10567814823693553843579082371037340304446717833564486723954783187805213309295;
    
    uint256 constant IC3x = 14064730931340025411665485957782398727949437655568442863280191596721448845572;
    uint256 constant IC3y = 11803993578718030236531069939023471232348286758213653538551860143081641708303;
    
    uint256 constant IC4x = 10307155782004774122349082366844971528471953531978284523098114818004943220504;
    uint256 constant IC4y = 16353429665252238962288802552062935953577649725661724794921672651833586069796;
    
    uint256 constant IC5x = 12324567818991167299299844389234440293768838691429194871304537948910093068312;
    uint256 constant IC5y = 7321724255352149736898486827945732590646937386432479444605418554318140246378;
    
    uint256 constant IC6x = 328039416468760085386865173265250378560693039409491876540052817992123999962;
    uint256 constant IC6y = 19162360963562421347816523969024726262859566289785879589898034049542971412996;
    
    uint256 constant IC7x = 6241753323114936917913691759601637253269646760463198667787543575204580463162;
    uint256 constant IC7y = 10544533316038390695287775800173553413559362276718820421497719579143066740254;
    
    uint256 constant IC8x = 17995606951665079142715855322573076693876496652262309035044691571948326302300;
    uint256 constant IC8y = 21176225661930840393996920114021465110270839921281975942093629590303214235891;
    
    uint256 constant IC9x = 6322650806864214116598632345717620008939991743501653664708550490639677264816;
    uint256 constant IC9y = 8416951927654039231425840468949969030029200906849991757366837293080293905110;
    
    uint256 constant IC10x = 8641587562569092902828116072307539621527805860364395101488729219312074246978;
    uint256 constant IC10y = 9344284493163127864960117837163233904724844073301767288187313309174207819154;
    
    uint256 constant IC11x = 13650929055736315907784205736179869251433731727205435545262038312591523818183;
    uint256 constant IC11y = 1579703459027159916590708365464963789659900474961611270269019520826455445271;
    
    uint256 constant IC12x = 17004142651504087200559253286177056906069347224250307919646592413572527397726;
    uint256 constant IC12y = 10320151890511654221397609869807808392937225065454462965225634686119101775554;
    
    uint256 constant IC13x = 21090797179831206182108016142758273011648357041561619374583919970190467417106;
    uint256 constant IC13y = 19948374369669567943381982358765696825422304032429452051994421388952702100020;
    
    uint256 constant IC14x = 6982079430673658188989034087550237770012721314607586112266741496331066603650;
    uint256 constant IC14y = 18975875662389672277216346959253450199045503916071595223170916591858154996320;
    
    uint256 constant IC15x = 4175406671074077955361656159000352702746304977661207286471794871745098407971;
    uint256 constant IC15y = 3332353597486162383066564720709752965874815473162850145971150197073696784459;
    
    uint256 constant IC16x = 16570671867581908755038820876733982736837207419928286923254317500966116959976;
    uint256 constant IC16y = 8324091814510332711656059525569873855547167665081142345715495822827905276771;
    
    uint256 constant IC17x = 3630304748500212259372775447566086623057265779866026520374353819742260821681;
    uint256 constant IC17y = 3121318314467596604357250579766423277002827751902554869477218833874235746500;
    
    uint256 constant IC18x = 12816683367615740987215104838382357234247842759868628770895378999369419375712;
    uint256 constant IC18y = 13853812583384893388837971493082205656879209443062840604622342573039419436084;
    
    uint256 constant IC19x = 19184502466516296725900800526890345481403308785559036850467904047719301021675;
    uint256 constant IC19y = 21794255167436900905737078240934571387612498403179808067398310301361985853501;
    
    uint256 constant IC20x = 12617292547620216740097370706540847929526253151105593819780210399365910097685;
    uint256 constant IC20y = 1678563525574474287360228036104876008685477725591217170844435047978487783996;
    
    uint256 constant IC21x = 4826299927256477984094806969870047478726423724550166636629958790850412163956;
    uint256 constant IC21y = 17444421188406093454314330219120256693803050584774575447260650541497075025564;
    
    uint256 constant IC22x = 1905621896719213135909095511624393036568445578629262681404544190913154221577;
    uint256 constant IC22y = 16277870580183751605309060244145516458027271007252963781481960155448170271367;
    
    uint256 constant IC23x = 4297028360796172375241965060401832707759982639914685243073830074958857993863;
    uint256 constant IC23y = 16365802550962895903774224100665073139102235789966705990688308574514987021596;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[23] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                
                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))
                
                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            
            checkField(calldataload(add(_pubSignals, 512)))
            
            checkField(calldataload(add(_pubSignals, 544)))
            
            checkField(calldataload(add(_pubSignals, 576)))
            
            checkField(calldataload(add(_pubSignals, 608)))
            
            checkField(calldataload(add(_pubSignals, 640)))
            
            checkField(calldataload(add(_pubSignals, 672)))
            
            checkField(calldataload(add(_pubSignals, 704)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
