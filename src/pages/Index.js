import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import config from '../config';
import MyModal from '../components/MyModal';
import dayjs from 'dayjs';

import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';
import { Modal } from 'bootstrap'; // Import the Modal module from Bootstrap

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

import AOS from 'aos';
import 'aos/dist/aos.css';

import '../styles/Shop.css'
import { Link } from 'react-router-dom';


function Index() {
    const [products, setProducts] = useState([]);
    const [carts, setCarts] = useState([]); // Items in Carts
    const [recordInCarts, setRecordInCarts] = useState(0);
    const [sumQty, setSumQty] = useState(0);
    const [sumPrice, setSumPrice] = useState(0);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [payDate, setPayDate] = useState(dayjs(new Date()).format('YYYY-MM-DD'));
    const [payTime, setPayTime] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [qrCodeUrl, setQrCodeUrl] = useState(''); // Stores the generated QR code URL



    useEffect(() => {
        fetchData();
        fetchDataFromLocal();
        AOS.init()
    }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get(config.apiPath + '/product/list');

            if (res.data.results !== undefined) {
                setProducts(res.data.results);
            }
        } catch (e) {
            Swal.fire({
                title: 'error',
                text: e.message,
                icon: 'error'
            })
        }
    }

    function showImage(item) {
        if (item.img !== undefined) {
            let imgPath = config.apiPath + '/uploads/' + item.img;

            if (item.img === "") imgPath = "default_image.png";

            return <img className='card-img-top object-fit-contain' height='250px' width='250px' src={imgPath} alt='item' />
        }

        return <></>;
    }


    const fetchDataFromLocal = () => {
        const itemInCarts = JSON.parse(localStorage.getItem('carts')) || [];
        setCarts(itemInCarts);
        setRecordInCarts(itemInCarts.length);
        computePriceAndQty(itemInCarts);
    };


    // const computePriceAndQty = (itemInCarts) => {
    //     let sumQty = 0;
    //     let sumPrice = 0;

    //     for (let i = 0; i < itemInCarts.length; i++) {
    //         const item = itemInCarts[i];
    //         sumQty++;
    //         sumPrice += parseInt(item.price);
    //     }

    //     setSumPrice(sumPrice);
    //     setSumQty(sumQty);
    // }

    const computePriceAndQty = (itemInCarts) => {
        let totalQty = 0;
        let totalPrice = 0;

        for (let i = 0; i < itemInCarts.length; i++) {
            const item = itemInCarts[i];
            totalQty += item.quantity; // Sum up quantities
            totalPrice += item.price * item.quantity; // Sum up prices based on quantity
        }

        setSumQty(totalQty);
        setSumPrice(totalPrice); // Update the total price
        setRecordInCarts(totalQty)
    };


    // const handleRemove = async (item) => {
    //     try {
    //         const button = await Swal.fire({
    //             title: 'ลบสินค้า',
    //             text: 'คุณต้องการลบสินค้าออกจากตระกร้าใช่หรือไม่',
    //             icon: 'question',
    //             showConfirmButton: true,
    //             showCancelButton: true
    //         })

    //         if (button.isConfirmed) {
    //             let arr = carts;

    //             for (let i = 0; i < arr.length; i++) {
    //                 const itemInCart = arr[i];

    //                 if (item.id === itemInCart.id) {
    //                     arr.splice(i, 1);
    //                 }
    //             }

    //             setCarts(arr);
    //             setRecordInCarts(arr.length);

    //             localStorage.setItem('carts', JSON.stringify(arr));

    //             computePriceAndQty(arr);
    //         }
    //     } catch (e) {
    //         Swal.fire({
    //             title: 'error',
    //             text: e.message,
    //             icon: 'error'
    //         })
    //     }
    // }

    const handleRemove = async (item) => {
        try {
            const button = await Swal.fire({
                title: 'ลบสินค้า',
                text: 'คุณต้องการลบสินค้าออกจากตระกร้าใช่หรือไม่',
                icon: 'question',
                showConfirmButton: true,
                showCancelButton: true,
            });

            if (button.isConfirmed) {
                // Create a new array by removing the first occurrence of the item
                const updatedCarts = [...carts];
                const index = updatedCarts.findIndex((cartItem) => cartItem.id === item.id);

                if (index !== -1) {
                    updatedCarts.splice(index, 1); // Remove the first occurrence
                }

                setCarts(updatedCarts);
                setRecordInCarts(updatedCarts.length);

                localStorage.setItem('carts', JSON.stringify(updatedCarts));

                computePriceAndQty(updatedCarts);

                Swal.fire({
                    title: 'สำเร็จ',
                    text: 'สินค้าได้ถูกลบออกจากตระกร้า',
                    icon: 'success',
                    timer: 1500,
                });
            }
        } catch (e) {
            Swal.fire({
                title: 'error',
                text: e.message,
                icon: 'error',
            });
        }
    };

    const handleSave = async () => {
        setIsSaving(true);

        try {
            const payload = {
                customerName: customerName,
                customerPhone: customerPhone,
                customerAddress: customerAddress,
                payDate: payDate,
                payTime: payTime,
                carts: carts
            }

            const res = await axios.post(config.apiPath + '/api/sale/save', payload);

            if (!customerName || !customerPhone || !customerAddress || !payDate || !payTime) {
                Swal.fire({
                    title: 'ผิดพลาด',
                    text: 'โปรดกรอกข้อมูลให้ครบทุกช่อง',
                    icon: 'error',
                });
                return;
            }

            if (res.data.message === 'success') {

                // Generate PromptPay QR Code
                const mobileNumber = '095-752-2016'; // Replace with your PromptPay phone number
                const amount = sumPrice;
                const promptPayPayload = generatePayload(mobileNumber, { amount });

                // Generate QR Code Image
                QRCode.toDataURL(promptPayPayload)
                    .then((url) => {
                        setQrCodeUrl(url); // Store QR Code URL


                        const qrModal = new Modal(document.getElementById('qrModal'));
                        qrModal.show();
                    })
                    .catch((err) => console.error('Error generating QR code:', err));

                localStorage.removeItem('carts');
                setRecordInCarts(0);
                setCustomerName('');
                setCustomerPhone('');
                setCustomerAddress('');
                setPayDate(new Date());
                setPayTime('');
                setCarts([]);

                Swal.fire({
                    title: 'บันทึกข้อมูล',
                    text: 'ระบบได้บันทึกข้อมูลของคุณแล้ว',
                    icon: 'success',
                    timer: 2000
                })

                document.getElementById('modalCart_btnClose').click();

            }
        } catch (e) {
            Swal.fire({
                title: 'error',
                text: e.message,
                icon: 'error'
            })
        } finally {
            setIsSaving(false);
        }
    }

    const handleDeposit = () => {
        Swal.fire({
            title: 'ยืนยันการชำระเงิน',
            text: 'ได้รับเงินเรียบร้อย',
            icon: 'success'
        })

        document.getElementById('qrModal_btnClose').click();
    }

    const handleIncrementModal = (index) => {
        const updatedCarts = [...carts];
        updatedCarts[index].quantity += 1; // Increment quantity
        setCarts(updatedCarts);

        // Update localStorage and recompute totals
        localStorage.setItem('carts', JSON.stringify(updatedCarts));
        computePriceAndQty(updatedCarts);
    };

    const handleDecrementModal = (index) => {
        const updatedCarts = [...carts];
        if (updatedCarts[index].quantity > 1) {
            updatedCarts[index].quantity -= 1; // Decrement quantity
            setCarts(updatedCarts);

            // Update localStorage and recompute totals
            localStorage.setItem('carts', JSON.stringify(updatedCarts));
            computePriceAndQty(updatedCarts);
        }
    };

    return (
        <>
            <Navbar />
            <div className="shop container py-3">
                {/* Cart Section */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="text-dark fw-bold" data-aos="fade-up" data-aos-duration="1400">
                        สินค้าของเรา
                    </h3>
                    <div className="my-cart d-flex align-items-center" data-aos="fade-up" data-aos-duration="1200">
                        <span className="me-3 text-muted" style={{ fontSize: '1.2rem' }}>ตะกร้าของฉัน</span>
                        <button
                            data-bs-toggle="modal"
                            data-bs-target="#modalCart"
                            className="btn btn-outline-success shadow-sm d-flex align-items-center px-3 py-2"
                            style={{ borderRadius: '25px' }}
                        >
                            <i className="fa fa-shopping-cart me-2"></i>
                            <span>{recordInCarts} ชิ้น</span>
                        </button>
                    </div>
                </div>

                {/* Products Section */}
                <div className="row g-4 py-3">
                    {products.length > 0 ? (
                        products.map((item) => (
                            <div className="col-12 col-sm-6 col-md-4" key={item.id}>
                                <div className="card" data-aos="fade-up" data-aos-duration="1800">
                                    <Link to={`/product/${item.id}`} className="text-decoration-none">
                                        <div className="card-img-top overflow-hidden" style={{ height: '200px' }}>
                                            {showImage(item)}
                                        </div>
                                    </Link>
                                    <div className="card-body text-center">
                                        <Link to={`/product/${item.id}`} className="text-decoration-none">
                                            <h5 className="card-title fw-bold text-dark">{item.name}</h5>
                                            <p className="card-text text-muted mb-0">{item.price.toLocaleString('th-TH')} บาท</p>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted">No products available.</p>
                    )}
                </div>
            </div>

            <Footer />

            <MyModal id='modalCart' title='ตะกร้าสินค้าของฉัน'>
                <table className='table table-bordered table-striped'>
                    <thead>
                        <tr>
                            <th>ชื่อสินค้า</th>
                            <th className='text-end'>ราคา</th>
                            <th className='text-end'>จำนวน</th>
                            <th width='60px'></th>
                        </tr>
                    </thead>
                    <tbody>
                        {carts.length > 0 ? carts.map((item, index) => (
                            <tr key={item.id}>
                                <td>{item.name}</td>
                                <td className='text-end'>{item.price.toLocaleString('th-TH')}</td>
                                <td className='text-end'>
                                    <div className="d-flex justify-content-center align-items-center">
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => handleDecrementModal(index)}
                                        >
                                            -
                                        </button>
                                        <span className="mx-2">{item.quantity}</span>
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => handleIncrementModal(index)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </td>
                                <td className='text-center'>
                                    <button
                                        className='btn btn-danger'
                                        onClick={() => handleRemove(item)}
                                    >
                                        <i className='fa fa-times'></i>
                                    </button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="4" className="text-center">ไม่มีสินค้าในตะกร้า</td></tr>}
                    </tbody>

                </table>

                <div className='text-center'>
                    จำนวน {sumQty} รายการ เป็นเงิน {sumPrice.toLocaleString('th-TH')} บาท
                </div>

                <div className='mt-3'>
                    <div>
                        <div>ชื่อผู้ซื้อ</div>
                        <input className='form-control' value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder='กรอกชื่อ-นามสกุล' />
                    </div>
                    <div className='mt-3'>
                        <div>เบอร์โทรติดต่อ</div>
                        <input className='form-control' value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder='กรอกเบอร์ติดต่อ' maxLength="10" />
                    </div>
                    <div className='mt-3'>
                        <div>ที่อยู่จัดส่ง</div>
                        <input className='form-control' value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder='กรอกที่อยู่' />
                    </div>
                    <div className='mt-3'>
                        <div>วันที่โอนเงิน</div>
                        <input className='form-control' type='date' value={payDate} onChange={e => setPayDate(e.target.value)} />
                    </div>
                    <div className='mt-3'>
                        <div>เวลาที่โอนเงิน</div>
                        <input className='form-control' type='time' value={payTime} onChange={e => setPayTime(e.target.value)} />
                    </div>
                    <button className='btn btn-primary mt-3' onClick={handleSave}>
                        <i className='fa fa-check mr-2'></i> ยืนยันการซื้อ
                    </button>
                </div>
            </MyModal>

            <MyModal id="qrModal" title="ชำระเงินผ่าน PromptPay">
                {qrCodeUrl ? (
                    <div className="text-center">
                        <img src={qrCodeUrl} alt="PromptPay QR Code" />
                        <p>Scan this QR code to pay {sumPrice.toLocaleString()} THB</p>
                        <button className='btn btn-primary mt-3' onClick={handleDeposit}>
                            <i className='fa fa-check mr-2'></i> ยืนยันการโอนเงิน
                        </button>
                    </div>

                ) : (
                    <p>Generating QR Code...</p>
                )}
            </MyModal>
        </>
    )
}

export default Index;